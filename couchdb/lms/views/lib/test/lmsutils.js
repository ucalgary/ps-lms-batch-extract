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