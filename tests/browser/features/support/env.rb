require "mediawiki_selenium"
require 'mediawiki_selenium/support'
require 'mediawiki_selenium/step_definitions'

require_relative "file_helper"

World(FileHelper)

# This allows us to use wait_for_ajax in step definitions.
PageObject.javascript_framework = :jquery
