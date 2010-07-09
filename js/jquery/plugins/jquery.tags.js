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
    $.fn.tags = function(options) {
	    var defaults = {
            showform: false,
            formlabel: 'Add tag(s):',
            buttontext: 'Add',
            listlabel: 'Tags:',
            deletetext: 'x',
            delimitter: ',', 
            linkformat: '',
            //submitstyle: 'string',
	        /* Events and Callbacks */
	        addtag:  function(e){ },
	        removetag:  function(e){ }
	    };
        var tagList = Array();
	    var self;
        var orig;
        var origname;
        var settings = $.extend( {}, defaults, options);
	    return this.each( function() {
            orig = $(this);
            $(this).wrap('<div class="tag-widget"></div>');
            $(this).parent().append('<button>'+settings.buttontext+'</button>');
            $(this).find('button').click( function(e) {
                _processInput();
                e.preventDefault(); 
                return false;
            });
            $(this).parent().append('<ul class="tag-list pkg"></ul>');
            $(this).parent().append( $(this).clone().attr('type','hidden').removeAttr('class').val('') );
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
	        obj = $(this).parent(); // set to the tag-widget class we just wrapped
	        self = obj;
            _processInput();
	    });	
        function _split( str ) {
            var delim = RegExp.escape(settings.delimitter);
            var delim_scan = new RegExp('^((([\'"])(.*?)\\3|.*?)(' + delim + '\\s*|$))', '');
            str = str.replace(/(^\s+|\s+$)/g, '');
            var tags = [];
            while (str.length && str.match(delim_scan)) {
                str = str.substr(RegExp.$1.length);
                orig.val(str);
                var tag = RegExp.$4 ? RegExp.$4 : RegExp.$2;
                tag = tag.replace(/(^\s+|\s+$)/g, '');
                tag = tag.replace(/\s+/g, ' ');
                if (tag != '') tags.push(tag);
            }
            return tags;
        };
        function _processInput() {
            var newtags = _split( self.find('input').val() );
            for(i = 0; i < newtags.length; i++) {
                _insertTag( newtags[i] );
            };
            self.find('ul li a.delete').click( function() {
                var tag = $(this).parent().find('a.tag').html();
                $(this).parent().remove();
                _removeTag( tag );
            });
        };
        function _removeTag( tag ) {
            var str = '';
            for (var i=0;i < tagList.length;i++) {
                if (tagList[i] == tag) {
                    tagList.splice(i,1);
	                i--;
                } else {
                    if (str != '') { str = str + settings.delimitter; }
                    str = str + tagList[i];
                }
            }
            self.find('input[name='+origname+']').val( str );

        };
        function _insertTag( tag ) {
            if ( _containsTag( tag ) ) { return; }
            var tag_esc = escape(tag).replace(/\+/g, '%2B').replace(/\"/g,'%22').replace(/\'/g, '%27').replace(/ /g,'+');
            self.find('ul').append('<li class="tag"><a class="tag" href="'+settings.linkformat + tag_esc+'">'+tag+'</a> <a href="javascript:void(0)" class="delete">'+settings.deletetext+'</a></li>');
            tagList.push(tag);
            var v = self.find('input[name='+origname+']').val();
            if (v != '') { v = v + settings.delimitter; }
            self.find('input[name='+origname+']').val( v + tag );
        };
        function _containsTag( tag ) {
            for (var i = 0; i < tagList.length; i++) {
                if (tag == tagList[i]) { return 1; }
            }
            return 0;
        };
    }})(jQuery);
