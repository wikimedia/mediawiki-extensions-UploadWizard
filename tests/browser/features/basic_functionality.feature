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
Feature: Basic functionality

  Background:
    Given I am logged in
      And I set my preference to skip the tutorial
    When I navigate to Upload Wizard

  Scenario: Navigate to Release rights page
    When I add file image.png
      And click button Continue
    Then Release rights page should open
      And thumbnail should be visible

  Scenario: Add two files
    When I add file image.png
      And I add file image2.png
    Then there should be 2 uploads

  Scenario: Add and remove file
    When I add file image.png
      And I remove file image.png
    Then there should be 0 uploads

  Scenario: Add two and remove one
    When I add file image.png
      And I add file image2.png
      And I add file image3.png
      And I remove file image2.png
    Then there should be 2 uploads
     And there should be an upload for image.png
     And there should be an upload for image3.png

  Scenario: Same name, different content
    When I add file image.png with 50% black, 50px x 50px
      And I add file image.png with 100% black, 100px x 70px
    Then a duplicate name error should appear

  Scenario: Navigate to Describe page
    When I add file image.png
      And click button Continue
      And I click This file is my own work
      And I click the Next button at the Release rights page
    Then Describe page should open
      And title text field should be there

  Scenario: Navigate to Use page
    When I add file image.png
      And click button Continue
      And I click This file is my own work
      And I click the Next button at the Release rights page
      And I enter title
      And I enter description
      And I enter category
      And I enter date
      And I click the Next button at the Describe page
      Then Upload more files button should be there

  Scenario: Scroll to error
    When I add file image.png
      And I add file image2.png
      And I add file image3.png
      And click button Continue
      And I click This file is my own work
      And I click the Next button at the Release rights page
      And I enter title
      And I enter date
      And I click the Next button at the Describe page
    Then I should be scrolled to the description field
      And the description field should have a warning next to it
