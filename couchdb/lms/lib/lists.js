var templates = require('duality/templates');

// ------------------------------------------------------------
// XML4 lists for Desire2Learn Holding Tank
// ------------------------------------------------------------

// 1 Templates
exports.xml4_template = function(head, req) {
	var template_predicate = function(row) {
		return (row.key.length == 2);
	}

	exports.xml4_document(head, req, 'xml4_template.xml', template_predicate);
}

// 2 Offerings
exports.xml4_offering = function(head, req) {
	var offering_predicate = function(row) {
		return (row.key.length == 2) && !((row.doc ? row.doc : row.value)['is_mapped']);
	}

	exports.xml4_document(head, req, 'xml4_offering.xml', offering_predicate);
}

// 3 Sections
exports.xml4_section = function(head, req) {
	var section_predicate = function(row) {
		return (row.key.length == 2);
	}

	exports.xml4_document(head, req, 'xml4_section.xml', section_predicate);
}

// 4 Users
exports.xml4_user = function(head, req) {
	exports.xml4_document(head, req, 'xml4_user.xml', null);
}

// 5 Enrollments
exports.xml4_enrollment = function(head, req) {
	exports.xml4_document(head, req, 'xml4_enrollment.xml', null);
}

// exports.xml4membership = function(head, req) {
// 	exports.xml4document(head, req, 'membership.xml');
// }

exports.xml4_document = function(head, req, template, predicate) {
	var row = null;

	start({
		code: 200,
		headers: {
			'Content-Type': 'application/xml'
		}
	});

	send('<?xml version="1.0" encoding="UTF-8"?>\n');
	// send('<!DOCTYPE ENTERPRISE SYSTEM "ims_epv1p1.dtd">\n');
	send('<enterprise>\n');

	while (row = getRow()) {
		if (predicate == null || predicate(row)) {
			send(templates.render(template, req, row));
		}
	}

	send('</enterprise>\n');
}

// ------------------------------------------------------------
// CSV/text lists for general information usage
// ------------------------------------------------------------

// list all defined mappings in CSV file
exports.list_mappings = function(head, req) {
	exports.text_document(head, req, 'list_mappings.txt');
}

// generate CCB file for all course offerings
exports.list_ccb = function(head, req) {
	exports.text_document(head, req, 'ccb.txt');
}

// generate CCB file for all course offerings
exports.list_labs_and_tutorials = function(head, req) {
	exports.text_document(head, req, 'labs_and_tutorials.txt');
}

// generate text file of instructor emails
exports.instructor_mlist = function(head, req) {
	exports.text_document(head, req, 'instructor_list.txt');
}


exports.text_document = function(head, req, template) {
	var row = null;

	start({
		code: 200,
		headers: {
			'Content-Type': 'text/csv'
		}
	});

	while (row = getRow()) {
		send(templates.render(template, req, {
			doc: row.doc ? row.doc : row.value
		}));
	}
}


// ------------------------------------------------------------
// Tab-delimited lists for Atlas Systems Ares
// ------------------------------------------------------------

exports.ares_courses = function(head, req) {
	var row = getRow();
	while (row != null && row.key.length != 2) {
		row = getRow();
	}

	start({
		code: 200,
		headers: {
			'Content-Type': 'text/tab-separated-values'
		}
	});

	do {
		var ctx = {
			'course': row,
			'instructor': null
		};
		var instructors = [];

		do {
			var candidate = getRow();
			if (candidate == null || candidate.key.length == 2) {
				row = candidate;
				break;
			}

			instructors.push(candidate);
		} while (true);

		if (instructors.length > 0) {
			ctx['instructor'] = instructors[0];
		}

		send(templates.render('ares_course.txt', req, ctx));
	} while (row != null);
}

exports.ares_courseusers = function(head, req) {
	exports.ares_feed(head, req, 'ares_courseuser.txt', null);
}

exports.ares_users = function(head, req) {
	exports.ares_feed(head, req, 'ares_user.txt', null);
}

exports.ares_feed = function(head, req, template, predicate) {
	var row = null;

	start({
		code: 200,
		headers: {
			'Content-Type': 'text/tab-separated-values'
		}
	});

	while (row = getRow()) {
		if (predicate == null || predicate(row)) {
			send(templates.render(template, req, row));
		}
	}
}
