if (typeof TCH === 'undefined') {
	var TCH = {};
}

if (typeof TCH.Utils === 'undefined') {
	TCH.Utils = {
		/**
		 * Find closest parent node with class or tag name for element.
		 * @param {Element} element Element from which to search parent
		 * @param {string} parentClass Class of searched for parent
		 * @param {string} tagName Tag of searched for parent
		 * @returns {null|Element}
		 */
		FindNearestParent: function (element, parentClass, tagName) {
			let parent = element.parentElement;

			do {
				if (parent !== null && (typeof (parentClass) !== 'undefined' && parent.classList.contains (parentClass))) {
					return parent;
				} else if (parent !== null && (typeof (tagName) !== 'undefined' && parent.tagName === tagName)) {
					return parent;
				}

				parent = parent !== null ? parent.parentElement : null;
			} while (parent !== null);

			return null;
		},

		/**
		 * Similar to Array.Map, but works on NodeList and does not map back to array, but just runs callback againts each element.
		 * @param {NodeList} nodeList NodeList on which to run function.
		 * @param {function} callback Callback to run againts each element.
		 */
		NodeListFunc: function (nodeList, callback) {
			for (let i = 0; i < nodeList.length; i++) {
				callback (nodeList [i]);
			}
		}
	};
}
