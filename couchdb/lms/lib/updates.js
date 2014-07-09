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