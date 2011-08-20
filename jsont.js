/*	This work is licensed under Creative Commons GNU LGPL License.

	License: http://creativecommons.org/licenses/LGPL/2.1/
	Version: 0.9
	Author:  Stefan Goessner/2006
	Web:     http://goessner.net/ 
*/

/**
 * Core jsont function
 *
 * @public
 * @function
 * @param {Object} self Object of data to transform
 * @param {Object} rules Object containing template data
*/
function jsonT(self, rules) {

	/**
	 * Core jsont function
	 *
	 * @public
	 * @function
	 * @param {Object} self Object of data to transform
	 * @param {Object} rules Object containing template data
	*/
	var Template = { // init fires, then apply
		output: false,
		init: function() {
			for (var rule in rules) {
				if (rule.substr(0,4) !== "self") {
					// make all properties of the rules object self.ruleName, i.e. 'link' becomes self.link
					rules["self." + rule] = rules[rule];	
				}
			}
			return this;
		},
		/**
		 * Public function to add the result of a processed template string to the result string
		 * <p>
		 * Apply starts to process the 'self' property, which in turn references the other properties
		 *
		 * @function
		 * @memberOf Template
		 * @param {String} expr The property name
		*/ 
		apply: function(expr) { // expr starts 'self'
			/**
			 * Private function to process a template string
			 *
			 * @function
			 * @memberOf Template.apply
			 * @param {String} str The rule template string
			*/ 
			var templateReFormat = function(str){
			        // regExp matched to var strings within the template strings
			        return str.replace(/\{([A-Za-z0-9_\$\.\[\]\'@\(\)]+)\}/g,
			 	       /**
			 		* Private function to process each match in each template string
			 		*
			 		*@param {String} $0 The whole variable string containing the brackets {var}
			 		*@param {String} $1 The variable string without brackets : var
			 		*/ 
			 		function($0,$1){
			 		        return Template.processArg($1, expr);
			 		}
			 	);
			},
			x = expr.replace(/\[[0-9]+\]/g, "[*]"), // replace any bracketed numbers with * operator for arrays
			result;
			
			if (x in rules) { // get the rule
			        if (typeof(rules[x]) === "string") {
			 	       result = templateReFormat(rules[x]);
			        }
			        else if (typeof(rules[x]) === "function") {
			 		// use the string result of a method call
			 	       result = templateReFormat(rules[x](Template.fakeEval(expr)).toString());
			 	       // if rules[x] is a function, it will run  with the property on the self object 
			 	       // of the same name as the single parameter, i.e. :
			 	       // self.age = 24, rules.age = function(x) { return 'I am ' + x; }; (x is sent in as 24)
			        }
			} else {
			        result = Template.evaluate(expr); // send result of reFormat to evaluate
			}
			return result;
		},
	 	/**
 	 	 * Public function to process the variable from a template string
 	 	 *
 	 	 * @function
 	 	 * @memberOf Template
 	 	 * @param {String} arg The variable from a template string
 		 * @param {String} parentExpr The property name of the rule, i.e. in 'name' : '<p>{$}</p>', the parentExpr is 'name'
		*/ 
		processArg: function(arg, parentExpr) {
			/**
			 * Private function to make an object reference from a property name & it's parent reference string.
			 * <p>
			 * a can be '$.name' & e 'self.person' = self.person.name
			 * a can be '$.name' & e 'person' = self.person.name
			 * 
			 * @function
			 * @memberOf Template.processArg
			 * @param {String} a property name at end of full reference string
			 * @param {String} e Parent string to a
			 * @returns An object reference string (see above examples)
			*/ 
			var expand = function(a, e){
				return (e = a.replace(/^\$/, e)) // replace $ in the string with e
					.substr(0,4) !== "self" ? ("self." + e) : e; // if 1st 4 chars are not 'self', add 'self.' to the start 
			},
			result = ""; // declaration of result string
			Template.output = true;
			if (arg.charAt(0) === "@") { // if the arg references a method in main object
				result = arg.replace(/@([A-za-z0-9_]+)\(([A-Za-z0-9_\$\.\[\]\']+)\)/, // evaluate the method evocation string *2
				/**
				 * Private function to make a string of code describing a method of the main object calling itself with another reference as a parameter
				 * <p>
				 * i.e. 'rules[self.person.getAge](self.person.age)'
				 * 
				 *@param {String} $0 Full string match
				 *@param {String} $1 Method name
				 *@param {String} $2 Parameter to be sent to the method (sent to the expand function for turning into a reference string
				 *@returns String of method for evocation
				*/ 
				function($0,$1,$2){
					// return "rules['self." + $1 + "'](" + expand($2, parentExpr) + ")";
					return rules['self.' + $1](Template.fakeEval(expand($2, parentExpr)));
				});
			} else if (arg !== "$") { // if the arg is not referring to the parent property 
				result = Template.apply(expand(arg, parentExpr)); // get a full reference to it and 
			} else {
			    	result = Template.evaluate(parentExpr);
			}
			Template.output = false;
			return result;
		},
		/**
		 * Public function to evaluate an object reference string
		 *
		 * @function
		 * @memberOf Template
		 * @param {String} expr
		*/ 
		evaluate: function(expr) {
			//var value = eval(expr), // It is assumed that any functions passed in as expr will be evaluated and return a result here *3
			var value = Template.fakeEval(expr),
	        	result = "";
        	
			if (typeof(value) !== "undefined") {
				if (value instanceof Array) {
					for (var i = 0; i < value.length; i++) {
						if (typeof(value[i]) !== "undefined") {
							result += Template.apply(expr + "[" + i + "]");
						}
					}
				}
				else if (typeof(value) === "object") {
					for (var m in value) {
					      if (typeof(value[m]) !== "undefined") {
					              result += Template.apply(expr + "." + m);
					      }
					}
				}
				else if (Template.output) {
				        result += value;
				}
			}
			return result;
		},
		/**
		 * Public function to process a string that represents a reference to a property on the self object
		 *
		 * @function
		 * @memberOf Template
		 * @param {String} expr The reference expression
		*/ 
		fakeEval: function(expr) {
			var result = self,
			idxs,
			getIdx = function($0, $1) {
			        idxs.push($1);
			        return '';
			},
			getArrayValue = function(expStr) {
			        var tmp;
			        idxs = [];
			        expStr = expStr.replace(/\[([0-9]+)\]/g, getIdx);
			        if(expStr === 'self') {
			      	  tmp = result;	
			        }
			        else {
			      	  tmp = result[expStr];
			        }
				// if there were indexes on the property name, got the end child of the 1st array child
			        if(idxs.length > 0) {
					for(var x = 0, y = idxs.length; x < y; x++) {
					        tmp = tmp[parseInt(idxs[x], 10)];
					}
			        }
			        result = tmp;	
	        	};
        	
			expr = expr.split('.');			
			for(var a = 0, b = expr.length; a < b; a++) {
			        getArrayValue(expr[a]);
			}
			return result;
		}
	}
	return Template.init().apply("self");
}
