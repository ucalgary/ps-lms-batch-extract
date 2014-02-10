exports.from_ps = function(doc, req) {
	var req_doc = JSON.parse(req.body);

	// If the request document does not have a datetime specified,
	// insert one based on the server's clock.
	if (!('datetime' in req_doc)) {
		req_doc['datetime'] = new Date().toISOString();
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