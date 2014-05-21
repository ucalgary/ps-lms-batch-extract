exports.from_ps = function(doc, req) {
	var req_doc = JSON.parse(req.body);

	// If the request document does not have a datetime specified,
	// insert one based on the server's clock.
	if (!('datetime' in req_doc)) {
		var lmsutils = require('views/lib/lmsutils');
		req_doc['datetime'] = lmsutils.DateToISOString(new Date());
	}

	// If there is not an existing doc, create one.
	if (!doc) {
		return [req_doc, 'Created.'];
	}

	// If there is an existing doc, update it if the
	// POST body is different than what's in the database
	
	var lmsutils = require('views/lib/lmsutils');

	if (!lmsutils.ps_docs_equal(doc, req_doc)) {
		req_doc['_rev'] = doc['_rev'];
		if ('mapping' in doc && !('mapping' in req_doc)) {
			req_doc['mapping'] = doc['mapping'];
		}

		if ('lmsexport' in doc) {
			req_doc['lmsexport'] = doc['lmsexport'];

		// For person document, track the datetime certain attributes
		// were changed. This is to enable custom business rules when
		// combining data from PeopleSoft and Destiny One
		if (req_doc['type'] == 'person') {
			var datetime = req_doc['datetime'];
			var interesting_keys = ['name', 'email'];
			var attribute_revisions = 'attribute_revisions' in doc ? doc['attribute_revisions'] : {}

			for (var i = 0; i < interesting_keys.length; i++) {
				var key = interesting_keys[i];
				var existing_value = doc[key];
				var request_value = req_doc[key];

				if (!lmsutils.ps_docs_equal(existing_value, request_value)) {
					attribute_revisions[key] = datetime;
				}
			}

			req_doc['attribute_revisions'] = attribute_revisions;
		}

		return [req_doc, 'Updated.'];
	} else {
		return [null, 'No changes.'];
	}
}

exports.member_status = function(doc, req) {
	// If there is not an existing doc, then this is a bad request.
	if (!doc) {
		return [null, 'No document specified.'];
	}

	// If there is an existing doc, make sure it is a memership document,
	// and update the role status if it is different than what is already
	// stored.
	if (!doc['type'] == 'member') {
		return [null, 'Not a member document.'];
	}

	if (doc['role']['status'] == req.body) {
		return [null, 'No changes.'];
	}

	doc['role']['status'] = req.body;
	return [doc, 'Updated.'];
}