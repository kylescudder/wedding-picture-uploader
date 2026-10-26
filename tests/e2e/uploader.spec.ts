import { expect, test, type Page } from '@playwright/test'
import postgres from 'postgres'

const sql = postgres(process.env.TEST_DATABASE_URL!, {
  max: 1,
  onnotice: () => {}
})
const guestId = '00000000-0000-4000-8000-000000000101'

test.beforeAll(async () => {
  await sql`INSERT INTO guest (id, forename) VALUES (${guestId}, 'WeddingTest')
    ON CONFLICT (id) DO UPDATE SET forename = EXCLUDED.forename`
})

test.beforeEach(async () => {
  await sql`DELETE FROM "guest-image" WHERE "guestId" = ${guestId}`
})

test.afterAll(async () => {
  await sql`DELETE FROM guest WHERE id = ${guestId}`
  await sql.end()
})

async function login(page: Page, forename = 'WeddingTest') {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'First name' }).fill(forename)
  await page.getByRole('button', { name: 'continue', exact: true }).click()
  await expect(page.getByText('disclaimer', { exact: true })).toBeVisible()
  await expect(page.locator('input[type=file]')).toBeAttached()
}

// Only the UploadThing provider boundary is stubbed. Login, gallery, image saves,
// and reloads use the real TanStack server and disposable PostgreSQL database.
async function stubUploadProvider(page: Page, rejectUpload = false) {
  await page.route('**/api/uploadthing?*', async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      input: { forename: 'WeddingTest' },
      files: [{ name: 'logo.svg', type: 'image/svg+xml' }]
    })
    if (rejectUpload) {
      await route.fulfill({ status: 400, json: { message: 'Upload rejected' } })
      return
    }
    await route.fulfill({
      json: [
        {
          url: 'http://127.0.0.1:3190/__test-upload',
          key: 'test-photo',
          customId: null
        }
      ]
    })
  })
  await page.route('**/__test-upload', async (route) => {
    if (route.request().method() === 'HEAD') {
      await route.fulfill({ status: 200, headers: { 'x-ut-range-start': '0' } })
      return
    }
    await route.fulfill({
      json: {
        ufsUrl: 'http://127.0.0.1:3190/logo.svg',
        serverData: { uploadedBy: guestId },
        fileHash: 'fixture'
      }
    })
  })
}

test('guest login trims names, ignores case, and survives a reload', async ({
  page
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await login(page, '  wEdDiNgTeSt  ')
  await page.reload()
  await expect(page.getByText('disclaimer', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'First name' })).toHaveCount(0)
  expect(errors).toEqual([])
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
})

test('unknown names show the existing error and remain on the login screen', async ({
  page
}) => {
  await page.goto('/')
  await page
    .getByRole('textbox', { name: 'First name' })
    .fill('UnknownWeddingTest')
  await page.getByRole('button', { name: 'continue', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Guest not found. Please check the name and try again.'
  )
  await expect(page.getByRole('textbox', { name: 'First name' })).toBeEnabled()
  await expect(page.locator('input[type=file]')).toHaveCount(0)
})

test('invalid saved guest data returns to login', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('guest', '{broken-json'))
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'First name' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('guest'))).toBeNull()
})

test('the gallery renders stored photos and the modal supports navigation and dismissal', async ({
  page,
  request
}) => {
  const saved = await request.post('/api/images', {
    data: {
      guestId,
      images: [
        'http://127.0.0.1:3190/logo.svg',
        'http://127.0.0.1:3190/wave.svg'
      ]
    }
  })
  expect(saved.ok()).toBe(true)
  await login(page)
  const thumbnails = page.getByRole('img', {
    name: 'uploaded by weddingtest',
    exact: true
  })
  await expect(thumbnails).toHaveCount(2)
  await thumbnails.first().click()
  const modal = page.getByRole('dialog', { name: 'Wedding photo' })
  await expect(modal).toBeVisible()
  await expect(
    modal.getByText('uploaded by weddingtest', { exact: true })
  ).toBeVisible()
  const firstImage = await modal.getByRole('img').getAttribute('src')
  await page.keyboard.press('ArrowRight')
  await expect(modal.getByRole('img')).not.toHaveAttribute('src', firstImage!)
  await page.keyboard.press('ArrowLeft')
  await expect(modal.getByRole('img')).toHaveAttribute('src', firstImage!)
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await page.reload()
  await expect(thumbnails).toHaveCount(2)
})

test('an upload saves real photo records, refreshes the gallery, and persists after reload', async ({
  page,
  request
}) => {
  await stubUploadProvider(page)
  await login(page)
  await page.locator('input[type=file]').setInputFiles('public/logo.svg')
  await expect(
    page.getByText('successfully uploaded 1 image!', { exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole('img', { name: 'uploaded by weddingtest', exact: true })
  ).toHaveCount(1)
  const saved = await (await request.get('/api/images')).json()
  expect(
    saved.filter((image: { guestId: string }) => image.guestId === guestId)
  ).toMatchObject([
    {
      guestId,
      key: 'http://127.0.0.1:3190/logo.svg',
      uploadedBy: 'WeddingTest'
    }
  ])
  await page.reload()
  await expect(
    page.getByRole('img', { name: 'uploaded by weddingtest', exact: true })
  ).toHaveCount(1)
})

test('an upload provider failure shows an error and creates no photo records', async ({
  page,
  request
}) => {
  await stubUploadProvider(page, true)
  await login(page)
  await page.locator('input[type=file]').setInputFiles('public/logo.svg')
  await expect(
    page.getByText('upload failed: Upload rejected', { exact: true })
  ).toBeVisible()
  const saved = await (await request.get('/api/images')).json()
  expect(
    saved.filter((image: { guestId: string }) => image.guestId === guestId)
  ).toEqual([])
})

test('a photo save failure is visible and does not report success', async ({
  page
}) => {
  await stubUploadProvider(page)
  await page.route('**/api/images', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        json: { error: 'Failed to insert images' }
      })
    } else await route.continue()
  })
  await login(page)
  await page.locator('input[type=file]').setInputFiles('public/logo.svg')
  await expect(
    page.getByText('failed to save images', { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText('successfully uploaded 1 image!', { exact: true })
  ).toHaveCount(0)
  await page.reload()
  await expect(
    page.getByRole('img', { name: 'uploaded by weddingtest', exact: true })
  ).toHaveCount(0)
})

test('gallery failures offer a retry which loads saved photos', async ({
  page,
  request
}) => {
  expect(
    (
      await request.post('/api/images', {
        data: { guestId, images: ['http://127.0.0.1:3190/logo.svg'] }
      })
    ).ok()
  ).toBe(true)
  await page.route('**/api/images', (route) =>
    route.fulfill({ status: 500, json: { error: 'Failed to fetch images' } })
  )
  await login(page)
  await expect(page.getByRole('alert')).toContainText('failed to load images')
  await page.unroute('**/api/images')
  await page.getByRole('button', { name: 'try again' }).click()
  await expect(
    page.getByRole('img', { name: 'uploaded by weddingtest', exact: true })
  ).toHaveCount(1)
})

test('server routes reject invalid inputs and expose the existing upload limits', async ({
  request
}) => {
  for (const data of [{}, { forename: ' ' }, { forename: 42 }]) {
    expect((await request.post('/api/guest/validate', { data })).status()).toBe(
      400
    )
  }
  expect(
    (
      await request.post('/api/images', { data: { guestId, images: [] } })
    ).status()
  ).toBe(400)
  expect(
    (
      await request.post('/api/images', {
        data: {
          guestId: '00000000-0000-4000-8000-000000000404',
          images: ['https://example.com/photo.jpg']
        }
      })
    ).status()
  ).toBe(404)
  const uploadConfig = await request.get('/api/uploadthing')
  expect(uploadConfig.ok()).toBe(true)
  expect(await uploadConfig.json()).toMatchObject([
    {
      slug: 'imageUploader',
      config: { image: { maxFileSize: '256MB', maxFileCount: 1000 } }
    }
  ])
})

test('healthz probes the database and every response carries the revision', async ({
  request
}) => {
  const health = await request.get('/healthz')
  expect(health.status()).toBe(200)
  expect(health.headers()['cache-control']).toBe('no-store')
  expect(health.headers()['x-wedding-picture-uploader-revision']).toBe(
    'development'
  )
  expect(await health.json()).toEqual({ ok: true, revision: 'development' })

  const home = await request.get('/')
  expect(home.headers()['x-wedding-picture-uploader-revision']).toBe(
    'development'
  )
})
