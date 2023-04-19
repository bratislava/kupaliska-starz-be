import { QueryInterface } from 'sequelize'
import { v4 as uuidv4 } from 'uuid'

export async function up(queryInterface: QueryInterface) {
	const openingHours =
		'[{"days":[{"dayName":"Pondelok","from":"09:00","to":"20:00"},{"dayName":"Utorok","from":"09:00","to":"20:00"},{"dayName":"Streda","from":"09:00","to":"20:00"},{"dayName":"Štvrtok","from":"09:00","to":"20:00"},{"dayName":"Piatok","from":"09:00","to":"20:00"},{"dayName":"Sobota","from":"09:00","to":"20:00"},{"dayName":"Nedeľa","from":"09:00","to":"20:00"}],"interval":{"from":"2021-07-02T10:00:00.000Z","to":"2021-08-11T10:00:00.000Z"}}, {"days":[{"dayName":"Pondelok","from":"09:00","to":"19:00"},{"dayName":"Utorok","from":"09:00","to":"19:00"},{"dayName":"Streda","from":"09:00","to":"19:00"},{"dayName":"Štvrtok","from":"09:00","to":"19:00"},{"dayName":"Piatok","from":"09:00","to":"19:00"},{"dayName":"Sobota","from":"09:00","to":"19:00"},{"dayName":"Nedeľa","from":"09:00","to":"19:00"}],"interval":{"from":"2021-08-12T10:00:00.000Z","to":"2021-09-01T10:00:00.000Z"}}]'
	return queryInterface.bulkInsert('swimmingPools', [
		{
			id: uuidv4(),
			name: 'Delfín',
			description: `Kúpalisko Delfín nájdete priamo v centre Ružinova, kde na vás čaká nový tobogán - kamikadze.`,
			expandedDescription: `Kúpalisko Delfín nájdete priamo v centre Ružinova, kde na vás čaká nový tobogán - kamikadze. Okrem toho máte k dispozícii tri bazény a štandardné vybavenie ako bazény, sprchy, šatne a sauny.`,
			waterTemp: 22,
			maxCapacity: 1000,
			openingHours: openingHours,
			facilities: '["shower", "changing-room", "playground", "food"]',
			locationUrl: 'https://goo.gl/maps/YST1w1Q7Vt7EpBDh9',
		},
		{
			id: uuidv4(),
			name: 'Tehelné pole',
			description: `Počas letnej sezóny určite nevynechajte návštevu kúpaliska Tehelné pole. Patrí k jednému z najkrajších a najznámejších bratislavských areálov.`,
			expandedDescription: `Počas letnej sezóny určite nevynechajte návštevu kúpaliska Tehelné pole. Patrí
			k jednému z najkrajších a najznámejších bratislavských areálov. K dispozícii máte tri vonkajšie bazény, vrátane plaveckého aj detského. Nechýba ani možnosť zapožičania lehátok.`,
			waterTemp: 22,
			maxCapacity: 1000,
			openingHours: openingHours,
			facilities:
				'["shower", "changing-room", "playground", "food", "parking"]',
			locationUrl: 'https://goo.gl/maps/jM1ykc3Ww8c2ErZz8',
		},
		{
			id: uuidv4(),
			name: 'Rosnička',
			description: `Krásne prostredie okolitých lesov dotvára príjemnú atmosféru areálu Rosnička, ktoré sa nachádza medzi mestskými časťami Dúbravka a Karlova Ves.`,
			expandedDescription: `Krásne prostredie okolitých lesov dotvára príjemnú atmosféru areálu Rosnička, ktoré sa nachádza medzi mestskými časťami Dúbravka a Karlova Ves. Najmä tých najmenších poteší trojdráhová šmykľavka, detské
			a beachvolejbalové ihrisko.`,
			waterTemp: 22,
			maxCapacity: 1000,
			openingHours: openingHours,
			facilities:
				'["shower", "changing-room", "playground", "food", "volleyball", "parking"]',
			locationUrl: 'https://goo.gl/maps/Y2NX3qjQKU92L6nZ6',
		},
		{
			id: uuidv4(),
			name: 'Zlaté piesky',
			description: `Jazero Zlaté Piesky patrí medzi najobľúbenejšie rekreačné areály v okolí.`,
			expandedDescription: `Jazero Zlaté Piesky patrí medzi najobľúbenejšie rekreačné areály v okolí. Okrem príjemného prostredia ponúka aj prístup k tobogánu, požičovňu vodných plavidiel, športové aj detské ihriská. Výhodou je aj možnosť ubytovania a stravovania počas dlhých letných večerov.`,
			waterTemp: 22,
			maxCapacity: 1000,
			openingHours: openingHours,
			facilities:
				'["shower", "changing-room", "playground", "food", "volleyball", "parking", "football", "accommodation" ]',
			locationUrl: 'https://goo.gl/maps/Nwhe2Xmwnzvt853JA',
		},

		{
			id: uuidv4(),
			name: 'Krasňany',
			description: `Letné kúpalisko Krasňany disponuje dvoma bazénmi - plaveckým a detským.`,
			expandedDescription: `Letné kúpalisko Krasňany disponuje dvoma bazénmi - plaveckým a detským. Okrem toho tu nájdete aj štandardnú výbavu ako sú šatne, bufet, či detské ihrisko. `,
			waterTemp: 22,
			maxCapacity: 1000,
			openingHours: openingHours,
			facilities: '[ "changing-room", "playground", "food"]',
			locationUrl: 'https://goo.gl/maps/Y2yNY6z1P9ZyDz4M6',
		},
		{
			id: uuidv4(),
			name: 'Rača',
			description: `Navštívte Kúpalisko Rača, ktoré sa nachádza v Knižkovej doline.`,
			expandedDescription: `Navštívte Kúpalisko Rača, ktoré sa nachádza v Knižkovej doline. V areáli sa nachádza 50 metrový plavecký bazén a k dispozícii je aj možnosť zakúpenia lehátok.`,
			waterTemp: 22,
			maxCapacity: 1000,
			openingHours: openingHours,
			facilities: '[ "changing-room", "food"]',
			locationUrl: 'https://goo.gl/maps/ZruEBPdRiPL5afiM6',
		},
		{
			id: uuidv4(),
			name: 'Lamač',
			description: `Znovuotvorené a zrekonštruované kúpalisko v Lamači disponuje troma vonkajšími bazénmi.`,
			expandedDescription: `Znovuotvorené a zrekonštruované kúpalisko v Lamači disponuje troma vonkajšími bazénmi. Športoví nadšenci tu nájdu dva stolnotenisové stoly, beachvolejbalové a detské ihrisko. Ponúka bezbariérový prístup v celom areáli, ako aj možnosť zapožičania lehátok a skriniek.`,
			waterTemp: 22,
			maxCapacity: 1000,
			openingHours: openingHours,
			facilities:
				'["shower", "changing-room", "playground", "food", "volleyball"]',
			locationUrl: 'https://goo.gl/maps/gvuMM4mYWvtGiRfN8',
		},
	])
}

export async function down(queryInterface: QueryInterface) {
	return queryInterface.bulkDelete('swimmingPools', undefined)
}
