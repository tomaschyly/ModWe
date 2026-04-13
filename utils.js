/**
 * Find closest parent node with class or tag name for element.
 * @param {Element} element Element from which to search parent.
 * @param {string} parentClass Class of searched for parent.
 * @param {string} tagName Tag of searched for parent.
 * @returns {null|Element}
 */
function findNearestParent(element, parentClass, tagName) {
	let parent = element ? element.parentElement : null;

	do {
		if (parent !== null && (typeof parentClass !== 'undefined' && parent.classList.contains(parentClass))) {
			return parent;
		} else if (parent !== null && (typeof tagName !== 'undefined' && parent.tagName === tagName)) {
			return parent;
		}

		parent = parent !== null ? parent.parentElement : null;
	} while (parent !== null);

	return null;
}

/**
 * Similar to Array.forEach but works on NodeList.
 * @param {NodeList} nodeList NodeList on which to run function.
 * @param {function} callback Callback to run against each element.
 */
function forEachNode(nodeList, callback) {
	for (let i = 0; i < nodeList.length; i++) {
		callback(nodeList [i], i);
	}
}
