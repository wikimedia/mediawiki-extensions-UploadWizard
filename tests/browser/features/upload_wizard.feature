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
Feature: UploadWizard

  Background:
    Given I am logged in
      And my Preferences Skip tutorial box is unchecked
    When I navigate to Upload Wizard

  Scenario: Navigate to Learn page
    Then Learn page should appear
      And Skip this step in the future checkbox should be there

  Scenario: Skip tutorial
    When I click the Skip checkbox
    And I click Next button at Learn page
    And I navigate to Upload Wizard
    Then the tutorial should not be visible

  Scenario: Navigate to Upload page
    When I click Next button at Learn page
    Then Upload page should appear

  Scenario: Navigate to Release rights page
    When I click Next button at Learn page
      And upload file image.png
      And click button Continue
    Then Release rights page should open
      And thumbnail should be visible

  Scenario: Navigate to Describe page
    When I click Next button at Learn page
      And upload file image.png
      And click button Continue
      And I click This file is my own work
      And I click Next button at Release rights page
    Then Describe page should open
      And title text field should be there

  Scenario: Navigate to Use page
    When I click Next button at Learn page
      And upload file image.png
      And click button Continue
      And I click This file is my own work
      And I click Next button at Release rights page
      And I enter title
      And I enter description
      And I enter category
      And I click Next button at Describe page
    Then Use page should open
    And Upload more files button should be there


