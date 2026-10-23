CREATE TABLE "guest" (
	"id" uuid PRIMARY KEY NOT NULL,
	"forename" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest-image" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" varchar(256) NOT NULL,
	"guestId" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guest-image" ADD CONSTRAINT "guest-image_guestId_guest_id_fk" FOREIGN KEY ("guestId") REFERENCES "public"."guest"("id") ON DELETE cascade ON UPDATE no action;