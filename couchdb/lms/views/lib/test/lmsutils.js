var lmsutils = require('../lmsutils');

exports.process_ps_course_code_general = {

	setUp: function(callback) {
		this.data = lmsutils.process_ps_course_code('2145-UCALG-ANTH-402-LEC01-50723');
		callback();
	},

	test_components: function(test) {
		test.equals(this.data['components'][0], 'S');
		test.equals(this.data['components'][1], '2014');
		test.equals(this.data['components'][2], 'ANTH');
		test.equals(this.data['components'][3], '402');
		test.equals(this.data['components'][4], '');
		test.equals(this.data['components'][5], 'L');
		test.equals(this.data['components'][6], '01');
		test.done();
	},

	test_ps_code: function(test) {
		test.equals(this.data['ps_code'], '2145-UCALG-ANTH-402-LEC01-50723');
		test.done();
	},

	test_bb_code: function(test) {
		test.equals(this.data['bb_code'], 'S2014ANTH402L01');
		test.done();
	},

	test_semester_name: function(test) {
		test.equals(this.data['semester_name'], 'Summer 2014');
		test.done();
	}

}

exports.process_ps_course_code_semesters = {

	test_winter: function(test) {
		var data = lmsutils.process_ps_course_code('2131-UCALG_ZOOL_377_LEC01-11540');

		test.equals(data['components'][0], 'W');
		test.equals(data['components'][1], '2013');
		test.equals(data['semester_name'], 'Winter 2013');
		test.done();
	},

	test_spring: function(test) {
		var data = lmsutils.process_ps_course_code('2143-UCALG-DRAM-651-SEMS01-31238');

		test.equals(data['components'][0], 'P');
		test.equals(data['components'][1], '2014');
		test.equals(data['semester_name'], 'Spring 2014');
		test.done();
	},

	test_summer: function(test) {
		var data = lmsutils.process_ps_course_code('2155-UCALG_KNES_260_LABB01-50180');

		test.equals(data['components'][0], 'S');
		test.equals(data['components'][1], '2015');
		test.equals(data['semester_name'], 'Summer 2015');
		test.done();
	},

	test_fall: function(test) {
		var data = lmsutils.process_ps_course_code('2167-UCALG-NEUR-500A-LABB01-76013');

		test.equals(data['components'][0], 'F');
		test.equals(data['components'][1], '2016');
		test.equals(data['semester_name'], 'Fall 2016');
		test.done();
	}

}

exports.process_ps_course_code_full_year_courses = {

	test_full_year_a: function(test) {
		var data = lmsutils.process_ps_course_code('2145-UCALG-ENGG-513A-LEC01-50711');

		test.equals(data['components'][4], 'A');
		test.equals(data['bb_code'], 'S2014ENGG513ABL01');
		test.done();
	},

	test_full_year_b: function(test) {
		var data = lmsutils.process_ps_course_code('2145-UCALG-ENGG-513B-LEC01-50711');

		test.equals(data['components'][4], 'B');
		test.equals(data['bb_code'], 'S2014ENGG513BL01');
		test.done();
	}

}

exports.process_ps_course_code_section_types = {

	test_lectures: function(test) {
		var data1 = lmsutils.process_ps_course_code('2145-UCALG-ANTH-402-LEC01-50723');
		var data2 = lmsutils.process_ps_course_code('2145-UCALG-ANTH-402-LECL01-50723');

		test.equals(data1['components'][5], 'L');
		test.equals(data2['components'][5], 'L');
		test.done();
	},

	test_labs: function(test) {
		var data1 = lmsutils.process_ps_course_code('2145-UCALG_CHEM_402_LAB01-50292');
		var data2 = lmsutils.process_ps_course_code('2145-UCALG_CHEM_402_LABB01-50292');

		test.equals(data1['components'][5], 'B');
		test.equals(data2['components'][5], 'B');
		test.done();
	},

	test_tutorials: function(test) {
		var data1 = lmsutils.process_ps_course_code('2141-UCALG_MDPH_731B_TUT01-12318');
		var data2 = lmsutils.process_ps_course_code('2141-UCALG_MDPH_731B_TUTT01-12318');

		test.equals(data1['components'][5], 'T');
		test.equals(data2['components'][5], 'T');
		test.done();
	},

	test_seminars: function(test) {
		var data1 = lmsutils.process_ps_course_code('2141-UCALG_OPMA_797_SEM01-16019');
		var data2 = lmsutils.process_ps_course_code('2141-UCALG_OPMA_797_SEMS01-16019');

		test.equals(data1['components'][5], 'S');
		test.equals(data2['components'][5], 'S');
		test.done();
	}

}

exports.course_code_originating_system = {

	test_destiny_one_codes: function(test) {
		var codes = [
			'WRI_440_003',
			'UPG_220_012',
			'TSL_121_015',
			'SPA_101_170'
		];

		for (i in codes) {
			test.equals(lmsutils.course_code_originating_system(codes[i]), 'Destiny One');
		}

		test.done();
	},

	test_peoplesoft_codes: function(test) {
		var codes = [
			'2145-UCALG-ANTH-402-LEC01-50723',
			'2145-UCALG_CHEM_402_LABB01-50292',
			'2141-UCALG-OPMA-797-SEMS01-16019',
			'2141-UCALG_FILM_201_TUTT01-12391'
		];

		for (i in codes) {
			test.equals(lmsutils.course_code_originating_system(codes[i]), 'PeopleSoft');
		}

		test.done();
	},

	test_unknown_codes: function(test) {
		var codes = [
			'ABC_000_1111',
			'2145-UCALE-ANTH-402-LEC01-50723',
			'testing-test_test',
			'lorem ipsum dolor'
		];

		for (i in codes) {
			test.equals(lmsutils.course_code_originating_system(codes[i]), null);
		}

		test.done();
	}

}