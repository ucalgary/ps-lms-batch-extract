var templates = require('duality/templates');

// ------------------------------------------------------------
// XML4 lists for Desire2Learn Holding Tank
// ------------------------------------------------------------

// 1 Templates
exports.xml4_template = function(head, req) {
	exports.xml4_document(head, req, 'xml4_template.xml');
}

// 2 Offerings
exports.xml4_offering = function(head, req) {
	exports.xml4_document(head, req, 'xml4_offering.xml');
}

// 3 Sections
exports.xml4_section = function(head, req) {
	exports.xml4_document(head, req, 'xml4_section.xml');
}

// 4 Users
exports.xml4_user = function(head, req) {
	exports.xml4_document(head, req, 'xml4_user.xml');
}

// 5 Enrollments
exports.xml4_enrollment = function(head, req) {
	exports.xml4_document(head, req, 'xml4_enrollment.xml');
}

// exports.xml4membership = function(head, req) {
// 	exports.xml4document(head, req, 'membership.xml');
// }

exports.xml4_document = function(head, req, template) {
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
		send(templates.render(template, req, {
			doc: row.doc ? row.doc : row.value
		}));
	}

	send('</enterprise>\n');
}

// ------------------------------------------------------------
// Tab-delimited lists for Atlas Systems Ares
// ------------------------------------------------------------

exports.ares_courses = function(head, req) {
	exports.ares_feed(head, req, 'ares_course.txt');
}

exports.ares_courseusers = function(head, req) {
	exports.ares_feed(head, req, 'ares_courseuser.txt');
}

exports.ares_users = function(head, req) {
	exports.ares_feed(head, req, 'ares_user.txt');
}

exports.ares_feed = function(head, req, template) {
	var row = null;

	start({
		code: 200,
		headers: {
			'Content-Type': 'text/tab-separated-values'
		}
	});

	while (row = getRow()) {
		send(templates.render(template, req, {
			doc: row.doc ? row.doc : row.value
		}));
	}
}
