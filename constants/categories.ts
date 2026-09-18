export const JOB_CATEGORIES = [
	"Dom i ogród",
	"Sprzątanie",
	"Montaż i naprawy",
	"Transport i przeprowadzki",
	"Zakupy i dostawy",
	"Zwierzęta",
	"Opieka",
	"Nauka i korepetycje",
	"Komputery i elektronika",
	"Motoryzacja",
	"Prace fizyczne",
	"Eventy i pomoc dorywcza",
	"Inne",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];
