.tag-widget {
  clear: both;
  position: relative;
}
.tag-widget ul {
  list-style: none;
  padding-left: 0;
  margin-top: 0;
}
.tag-widget li {
  float: left;
  margin-right: 10px;
  padding: 3px;
}
.tag-widget li a {
  text-decoration: none;
}
.tag-widget li:hover a {
  text-decoration: none;
  color: white;
}
.tag-widget li {
  background-color: #fff;
  border-radius: 4px;
  -moz-border-radius: 4px;
  -webkit-border-radius: 4px;
  border-top: 1px solid #fff;
  border: 1px solid #fff;
  color: black;
  font-size: 12px;

}
.tag-widget li:hover {
  background-color: #444;
  border-radius: 4px;
  -moz-border-radius: 4px;
  -webkit-border-radius: 4px;
  border-top: 1px solid #111;
  border: 1px solid #222;
  color:white;
}


/* Utilities */
.pkg:after, #content-inner:after {
    content: " ";
    display: block;
    visibility: hidden;
    clear: both;
    height: 0.1px;
    font-size: 0.1em;
    line-height: 0;
}
.pkg, #content-inner { display: inline-block; }
/* no ie mac \*/
* html .pkg, * html #content-inner { height: 1%; }
.pkg, #content-inner { display: block; }
/* */
