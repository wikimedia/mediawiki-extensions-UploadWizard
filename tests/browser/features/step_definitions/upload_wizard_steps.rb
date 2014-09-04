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
Given(/^I am logged out$/) do
  visit LogoutPage
end

Given(/^my Preferences Skip tutorial box is unchecked$/) do
  visit(PreferencesPage) do |page|
    page.upload_wizard_pref_tab_element.when_present.click
    page.uncheck_reset_skip_checkbox
    page.preferences_save_button_element.click
  end
end

When(/^click button Continue$/) do
  on(UploadPage).continue_element.when_present(15).click
end
When(/^I click Next button$/) do
  on(UploadWizardPage).next_element.when_present(15).click
end
When(/^I click Next button at Describe page$/) do
  sleep 1 # todo # I can not figure out at the moment how to make this work without using sleep
  on(DescribePage).next_element.when_present(15).click
end
When(/^I click Next button at Learn page$/) do
  on(LearnPage).next_element.when_present(15).click
end
When(/^I click Next button at Release rights page$/) do
  on(ReleaseRightsPage).next_element.when_present(15).click
end
When(/^I click This file is my own work$/) do
  on(ReleaseRightsPage).select_my_own_work
end
When(/^I enter category$/) do
  on(DescribePage).category = "Test"
end
When(/^I enter description$/) do
  on(DescribePage).description = "description"
end
When(/^I enter title$/) do
  on(DescribePage).title = "Title #{Random.new.rand}"
end
When(/^I navigate to Upload Wizard$/) do
  visit UploadWizardPage
end
When(/^thumbnail should be visible$/) do
  on(ReleaseRightsPage).thumbnail_element.when_present.should be_visible
end
When(/^I click the Skip checkbox$/) do
  on(LearnPage).check_tutorial_skip
end

Then(/^link to log in should appear$/) do
  on(UploadWizardPage).logged_in_element.should be_visible
end
Then(/^(.+) checkbox should be there$/) do |_|
  on(LearnPage).tutorial_skip_element.when_present.should be_visible
end
Then(/^the tutorial should not be visible$/) do
  on(LearnPage).tutorial_element.should_not be_visible
end
Then(/^Describe page should open$/) do
  @browser.url.should match /Special:UploadWizard/
end
Then(/^Learn page should appear$/) do
  @browser.url.should match /Special:UploadWizard/
end
Then(/^Release rights page should open$/) do
  @browser.url.should match /Special:UploadWizard/
end
Then(/^Select a media file to donate button should be there$/) do
  sleep 1
  on(UploadPage).select_file_element.when_present.should be_visible
end
Then(/^title text field should be there$/) do
  on(DescribePage).title_element.when_present.should be_visible
end
Then(/^Upload more files button should be there$/) do
  on(UsePage).upload_more_files_element.when_present.should be_visible
end
Then(/^Upload page should appear$/) do
  @browser.url.should match /Special:UploadWizard/
end
Then(/^Use page should open$/) do
  @browser.url.should match /Special:UploadWizard/
end
