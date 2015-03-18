@login @chrome @firefox @commons.wikimedia.beta.wmflabs.org @test2.wikipedia.org
Feature: Flickr upload

  Scenario: Upload image from Flickr
    Given I am logged in
      And I am on the file upload step
    When I click the Flickr import button
      And I enter https://www.flickr.com/photos/fscholz/13540630105/ as the Flickr URL
      And I click the Get from Flickr button
      And click button Continue
    Then upload number 1 should have the title Rheinturm
      And upload number 1 should have the description Photos in Düsseldorf, Taken with a FED5B, Industar-61L 55mm F2.8
      And upload number 1 should have the date 2014-03-31 18:17:17

  Scenario: Upload multiple images from Flickr at once
    Given I am logged in
      And I am on the file upload step
    When I click the Flickr import button
      And I enter https://www.flickr.com/photos/79472036@N07/with/13541023264/ as the Flickr URL
      And I click the Get from Flickr button
      And I click Flickr upload 0
      And I click Flickr upload 1
      And I click the Upload selected images button
      And click button Continue
    Then the Flickr uploads have the correct information

  Scenario: Lack of Flickr rights during upload
    Given I am logged in
      And I am on the file upload step
      And I don't have Flickr upload rights
    When I add file image.png
      And I remove file image.png
      And I add file image.png
    Then the Flickr import button should be absent

  Scenario: Lack of Flickr rights when reset
    Given I am logged in
      And I am on the file upload step
      And I don't have Flickr upload rights
    When I add file image.png
      And I remove file image.png
    Then the Flickr import button should be absent