RegExp.escape = (function() {
  var specials = [
    '/', '.', '*', '+', '?', '|',
    '(', ')', '[', ']', '{', '}', '\\'
  ];

  sRE = new RegExp(
    '(\\' + specials.join('|\\') + ')', 'g'
  );
  
  return function(text) {
    return text.replace(sRE, '\\$1');
  }
})();
(function($){
    $.fn.mwCoolCats = function(options) {
	    var defaults = {
            showform: false,
            formlabel: 'Add cat(s):',
            buttontext: 'Add',
            listlabel: 'Cats:',
            deletetext: 'x',
            delimitter: ',', 
            linkformat: '',
            //submitstyle: 'string',
	        /* Events and Callbacks */
	        addcat:  function(e){ },
	        removecat:  function(e){ }
	    };
        var catList = Array();
	    var self;
        var orig;
        var origname;
        var settings = $.extend( {}, defaults, options);
	    return this.each( function() {
            orig = $(this);
            $(this).wrap('<div class="cat-widget"></div>');
            $(this).parent()
		.append( $j( '<button type="button">'+settings.buttontext+'</button>' ) 
			    .click( function(e) {
				e.stopPropagation(); 
				e.preventDefault(); 
				_processInput();
				return false;
			    }) );
            $(this).parent().append('<ul class="cat-list pkg"></ul>');
            $(this).parent().append( $(this).clone().attr('type','hidden').removeAttr('class').val('') );

	    //XXX ensure this isn't blocking other stuff needed.
            $(this).parents('form').submit( function() {
                _processInput();
            });
            $(this).parents('form').keydown( function(e) {
                if(e.keyCode == 13) { 
                    e.preventDefault(); 
                    return false;
                }
            });

            origname = $(this).attr('name');
            $(this).removeAttr('name');
            $(this).keyup(function(e) { 
                if(e.keyCode == 13) { 
                    e.stopPropagation(); 
                    e.preventDefault(); 
                    _processInput();
                } 
            });
	        obj = $(this).parent(); // set to the cat-widget class we just wrapped
	        self = obj;
            _processInput();
	    });	
        function _split( str ) {
            var delim = RegExp.escape(settings.delimitter);
            var delim_scan = new RegExp('^((([\'"])(.*?)\\3|.*?)(' + delim + '\\s*|$))', '');
            str = str.replace(/(^\s+|\s+$)/g, '');
            var cats = [];
            while (str.length && str.match(delim_scan)) {
                str = str.substr(RegExp.$1.length);
                orig.val(str);
                var cat = RegExp.$4 ? RegExp.$4 : RegExp.$2;
                cat = cat.replace(/(^\s+|\s+$)/g, '');
                cat = cat.replace(/\s+/g, ' ');
                if (cat != '') cats.push(cat);
            }
            return cats;
        };
        function _processInput() {
            var newcats = _split( self.find('input').val() );
            for(i = 0; i < newcats.length; i++) {
                _insertCat( newcats[i] );
            };
            self.find('ul li a.delete').click( function() {
                var cat = $(this).parent().find('a.cat').html();
                $(this).parent().remove();
                _removeCat( cat );
            });
        };
        function _removeCat( cat ) {
            var str = '';
            for (var i=0;i < catList.length;i++) {
                if (catList[i] == cat) {
                    catList.splice(i,1);
	                i--;
                } else {
                    if (str != '') { str = str + settings.delimitter; }
                    str = str + catList[i];
                }
            }
            self.find('input[name='+origname+']').val( str );

        };
        function _insertCat( cat ) {
            if ( _containsCat( cat ) ) { return; }
            var cat_esc = escape(cat).replace(/\+/g, '%2B').replace(/\"/g,'%22').replace(/\'/g, '%27').replace(/ /g,'+');
            self.find('ul').append('<li class="cat"><a class="cat" href="'+settings.linkformat + cat_esc+'">'+cat+'</a> <a href="javascript:void(0)" class="delete">'+settings.deletetext+'</a></li>');
            catList.push(cat);
            var v = self.find('input[name='+origname+']').val();
            if (v != '') { v = v + settings.delimitter; }
            self.find('input[name='+origname+']').val( v + cat );
        };
        function _containsCat( cat ) {
            for (var i = 0; i < catList.length; i++) {
                if (cat == catList[i]) { return 1; }
            }
            return 0;
        };
    }})(jQuery);
