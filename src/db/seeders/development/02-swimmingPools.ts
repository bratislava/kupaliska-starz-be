import { QueryInterface } from 'sequelize'
import { v4 as uuidv4 } from 'uuid'

export async function up(queryInterface: QueryInterface) {
	const facilities =
		'["restaurant", "changing_rooms", "shower", "playground"]'
	return queryInterface.bulkInsert('swimmingPools', [
		{
			id: uuidv4(),
			name: 'Delfín',
			description: `Kúpalisko Delfín nájdete priamo v centre Ružinova, kde na vás čaká nový tobogán - kamikadze.`,
			expandedDescription: `Kúpalisko Delfín nájdete priamo v centre Ružinova, kde na vás čaká nový tobogán - kamikadze. Okrem toho máte k dispozícii tri bazény a štandardné vybavenie ako bazény, sprchy, šatne a sauny.`,
			waterTemp: 22,
			maxCapacity: 1000,
			openingHours: '[{}]',
			facilities: facilities,
		},
		{
			id: uuidv4(),
			name: 'Rosnička',
			description: `Krásne prostredie okolitých lesov dotvára príjemnú atmosféru areálu Rosnička, ktoré sa nachádza medzi mestskými časťami Dúbravka a Karlova Ves.`,
			expandedDescription: `Krásne prostredie okolitých lesov dotvára príjemnú atmosféru areálu Rosnička, ktoré sa nachádza medzi mestskými časťami Dúbravka a Karlova Ves. Najmä tých najmenších poteší trojdráhová šmykľavka, detské
			a beachvolejbalové ihrisko.`,
			waterTemp: 22,
			maxCapacity: 800,
			openingHours: '[{}]',
			facilities: facilities,
		},
		{
			id: uuidv4(),
			name: 'Zlaté piesky',
			description: `Kúpalisko Delfín nájdete priamo v centre Ružinova, kde na vás čaká nový tobogán - kamikadze.`,
			expandedDescription: `Jazero Zlaté Piesky patrí medzi najobľúbenejšie rekreačné areály v okolí.`,
			waterTemp: 22,
			maxCapacity: 1000,
			openingHours: '[{}]',
			facilities: facilities,
		},
		{
			id: uuidv4(),
			name: 'Tehelné pole',
			description: `Počas letnej sezóny určite nevynechajte návštevu kúpaliska Tehelné pole. Patrí k jednému z najkrajších a najznámejších bratislavských areálov.`,
			expandedDescription: `Počas letnej sezóny určite nevynechajte
			návštevu kúpaliska Tehelné pole. Patrí
			k jednému z najkrajších a najznámejších bratislavských areálov. K dispozícii máte tri vonkajšie bazény, vrátane plaveckého aj detského. Nechýba ani možnosť zapožičania lehátok.`,
			waterTemp: 22,
			maxCapacity: 1000,
			openingHours: '[{}]',
			facilities: facilities,
		},
	])
}

export async function down(queryInterface: QueryInterface) {
	return queryInterface.bulkDelete('swimmingPools', undefined)
}
