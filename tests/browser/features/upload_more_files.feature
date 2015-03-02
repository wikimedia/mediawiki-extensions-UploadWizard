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
Feature: Upload more files

  Background:
    Given I am logged in
      And I set my preference to skip the tutorial
    When I navigate to Upload Wizard

  Scenario: Upload more files
    When I add file image.png
      And click button Continue
      And I click This file is my own work
      And I click the Next button at the Release rights page
      And I enter title
      And I enter description
      And I enter category
      And I enter date
      And I click the Next button at the Describe page
      And I click Upload more files button at Use page
      And I wait for the upload interface to be present
      And I add file image3.png
    Then there should be 1 uploads
      And there should be an upload for image3.png

