@login @chrome @firefox @commons.wikimedia.beta.wmflabs.org @test2.wikipedia.org
Feature: Chunked upload

  Scenario: Upload large file
    Given I am logged in
      And I am on the file upload step
      And chunked upload is enabled in my preferences
    When I upload a large file
    Then the upload should finish
