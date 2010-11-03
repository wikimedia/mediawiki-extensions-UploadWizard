						/**
		* 
		* Helper function to get revision text for a given title
		* 
		* Assumes "follow redirects" 
		* 
		* $j.getTextFromTitle( [apiUrl], title, callback )
		*  
		* @param {String} url or title key
		* @parma {Mixed} title or callback function
		* @param {Function} callback Function or NULL
		* 
		* @return callback is called with:
		* 	{Boolean} false if no page found 
		* 	{String} text of wiki page	 
		*/
		getTextFromTitle: function( title, callback ) {
			var request = {
				// Normalize the File NS (ie sometimes its present in apiTitleKey other times not
				'titles' : title,
				'prop' : 'revisions',
				'rvprop' : 'content'
			};	
			
			this.get( request, function( response ) {			
				if( !response || !response.query || !response.query.pages ) {
					callback( false );	
				}
				var pages = response.query.pages;			
				for(var i in pages) {
					page = pages[ i ];
					if( page[ 'revisions' ] && page[ 'revisions' ][0]['*'] ) {
						callback( page[ 'revisions' ][0]['*'] );
					}
				}
			} );
		},	

/*
		// Stub feature apiUserNameCache to avoid multiple calls 
		// ( a more general api framework should be developed  ) 
		apiUserNameCache: {},

		/**
		 * Api helper to grab the username
		 * @param {Function} callback Function to callback with username or false if not found
		 * @param {Boolean} fresh A fresh check is issued.	 	
		 */
		 getUserName: function( callback, fresh ){	 		 	
		
			/*	
			// If apiUrl is local check wgUserName global
			//  before issuing the api request.
			if( mw.isLocalDomain( apiUrl ) ){	 		
				if( typeof wgUserName != 'undefined' &&  wgUserName !== null ) {
					callback( wgUserName )
					// In case someone called this function without a callback
					return wgUserName;
				}
			}

			*/

			if( ! fresh && apiUserNameCache[ apiUrl ]  ) {
				callback( apiUserNameCache[ apiUrl ]  );
				return ; 
			}
			
			// Setup the api request
			var parameters = {
				'action':'query',
				'meta':'userinfo'
			}
			
			// Do request 
			this.get( request, function( data ) {
				if( !data || !data.query || !data.query.userinfo || !data.query.userinfo.name ){
					// Could not get user name user is not-logged in
					mw.log( " No userName in response " );
					callback( false );
					return ;
				}
				// Check for "not logged in" id == 0
				if( data.query.userinfo.id == 0 ){
					callback( false );
					return ;
				}
				/* apiUserNameCache[ apiUrl ] = data.query.userinfo.name; */
				// Else return the username: 
				callback( data.query.userinfo.name );				
			}, function(){
				// Timeout also results in callback( false ) ( no user found) 
				callback( false );
			} );
		}
*/
	
		/**
		* Issues the wikitext parse call 
		* 
		* @param {String} wikitext Wiki Text to be parsed by mediaWiki api call
		* @param {String} title Context title of the content to be parsed
		* @param {Function} callback Function called with api parser output 
		*/
		parseWikiText: function( wikitext, title, callback ) {	
			mw.log("mw.parseWikiText text length: " + wikitext.length + ' title context: ' + title );
			// TODO mw.load? ajax? why?    
			mw.load( 'JSON', function(){
				$j.ajax( {
					type: 'POST',
					url: this.url,
					// Give the wiki 60 seconds to parse the wiki-text
					timeout : 60000,
					data: {
						'action': 'parse',
						'format': 'json',
						'title' : title,
						'text': wikitext				
					},
					dataType: 'text',
					success: function( data ) {
						var jsonData = JSON.parse( data ) ;
						// xxx should handle other failures				 
						callback( jsonData.parse.text['*'] );
					},
					error: function( XMLHttpRequest, textStatus, errorThrown ){
						// xxx should better handle failures		
						mw.log( "Error: mw.parseWikiText:" + textStatus );
						callback(  "Error: failed to parse wikitext " ); 
					}			 
				} );
			} );
		},



		// Api actions that must be submitted in a POST, and need an api proxy for cross domain calls
		// TODO protecting app code from knowing it's supposed to POST or not is a dubious benefit. :(
		apiPostActions: [ 'login', 'purge', 'rollback', 'delete', 'undelete',
			'protect', 'block', 'unblock', 'move', 'edit', 'upload', 'emailuser',
			'import', 'userrights' ],

	
		/**
		* Checks if a mw request data requires a post request or not
		* @param {Object} 
		* @return {Boolean}
		*	true if the request requires a post request
		* 	false if the request does not
		*/		
		mw.checkRequestPost = function ( data ) {		
			if( $j.inArray( data['action'],  this.apiPostActions ) != -1 ) {
				return true;
			}
			if( data['prop'] == 'info' && data['intoken'] ) {
				return true;			
			}
			if( data['meta'] == 'userinfo' ) {
				return true;
			}
			return false;
		}
		

