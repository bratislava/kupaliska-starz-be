module.exports = {
	input: ['src/**/*.{ts,tsx}'],
	output: './',
	options: {
		debug: false,
		func: {
			list: ['i18next.t', 'translation', 't'],
			extensions: ['.ts', '.tsx'],
		},
		sort: true,
		trans: false,
		removeUnusedKeys: false,
		lngs: ['sk'],
		ns: ['email', 'translation', 'error', 'success'],
		defaultLng: 'sk',
		defaultNs: 'translation',
		defaultValue: '_NEPRELOZENE_',
		resource: {
			loadPath: 'locales/{{lng}}/{{ns}}.json',
			savePath: 'locales/{{lng}}/{{ns}}.json',
			jsonIndent: 4,
			lineEnding: '\n',
		},
		nsSeparator: ':',
	},
}
