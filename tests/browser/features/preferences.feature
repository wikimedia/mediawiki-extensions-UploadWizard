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
@chrome @commons.wikimedia.beta.wmflabs.org @firefox @login @test2.wikipedia.org
Feature: Preferences

  Background:
    Given I am logged in
      And I set my preference to skip the tutorial

  Scenario: Set license preference to show the tutorial
    When I unset Skip introductory licensing tutorial in my Preferences
      And I navigate to Upload Wizard
    Then Learn page should appear
      And Skip this step in the future checkbox should be there

  Scenario: Skip tutorial
    When I unset Skip introductory licensing tutorial in my Preferences
      And I navigate to Upload Wizard
      And I click the Skip checkbox
      And I click the Next button at the Learn page
      And I navigate to Upload Wizard
    Then the tutorial should not be visible

  Scenario: Set license preference to Own work - Creative Commons CC0 Waiver
    When I set the default license to Own work - Creative Commons CC0 Waiver in my Preferences
      And I navigate to Upload Wizard
      And I add file image.png
      And I add file image2.png
      And click button Continue
      And I click Provide copyright information for each file
      And I click the Next button at the Release rights page
      And I click Use a different license for the first file
    Then Creative Commons CC0 Waiver should be checked for the first file

  Scenario: Set license preference to Someone else's work - Original work of NASA
    When I set the default license to Someone else's work - Original work of NASA in my Preferences
      And I navigate to Upload Wizard
      And I add file image.png
      And I add file image2.png
      And click button Continue
      And I click Provide copyright information for each file
      And I click the Next button at the Release rights page
    Then Original work of NASA should be checked for the first file

  Scenario: Set license preference to Use whatever the default is
    When I set the default license to Use whatever the default is in my Preferences
      And I navigate to Upload Wizard
      And I add file image.png
      And I add file image2.png
      And click button Continue
      And I click Provide copyright information for each file
      And I click the Next button at the Release rights page
    Then The Release rights radio buttons should be unchecked