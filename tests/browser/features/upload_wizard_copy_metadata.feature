#
# This file is subject to the license terms in the COPYING file found in the
# UploadWizard top-level directory and at
# https://git.wikimedia.org/blob/mediawiki%2Fextensions%2FUploadWizard/HEAD/COPYING. No part of
# UploadWizard, including this file, may be copied, modified, propagated, or
# distributed except according to the terms contained in the COPYING file.
#
# Copyright 2012-2014 by the Mediawiki developers. See the CREDITS file in the
# UploadWizard top-level directory and at
# https://git.wikimedia.org/blob/mediawiki%2Fextensions%2FUploadWizard/HEAD/CREDITS
#

# IMPORTANT: For scenarios which set a preference, tag as @preferenceSet to
# reset to defaults after they are finished. (See support/hooks.rb)

@chrome @commons.wikimedia.beta.wmflabs.org @firefox @login @test2.wikipedia.org
Feature: Copy metadata

  Background:
    Given I am logged in
      And I set my preference to skip the tutorial
    When I navigate to Upload Wizard
      And I add file image.png
      And I add file image2.png
      And click button Continue
      And I click This file is my own work
      And I click the Next button at the Release rights page
      And I click Copy information to all uploads below
      And I uncheck all of the copy checkboxes

  Scenario: Copy description
    When I enter metadata description Testing 1 2 3
      And I check Descriptions
      And I click the Copy button
    Then upload number 2 should have the description Testing 1 2 3

  Scenario: Copy category
    When I enter metadata category Testing 4 5 6
      And I check Categories
      And I click the Copy button
    Then upload number 2 should have the category Testing 4 5 6

  Scenario: Copy date
    When I enter metadata date 1990-04-28
      And I check Date
      And I click the Copy button
    Then upload number 2 should have the date 1990-04-28

  Scenario: Copy title
    When I enter metadata title This is a test file
      And I check Title
      And I click the Copy button
    Then upload number 2 should have the title This is a test file 02
      And upload number 1 should have the title This is a test file 01
