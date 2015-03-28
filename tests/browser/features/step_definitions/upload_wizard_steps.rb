require "tempfile"

Given(/^I am logged out$/) do
  visit LogoutPage
end

Given(/^I set my preference to skip the tutorial$/) do
  api.action(:options, change: 'upwiz_skiptutorial=1')
end

When(/^I unset Skip introductory licensing tutorial in my Preferences$/) do
  visit(PreferencesPage) do |page|
    page.upload_wizard_pref_tab_element.when_present.click
    page.uncheck_reset_skip_checkbox
    page.preferences_save_button_element.click
    page.wait_for_ajax
  end
end

When(/^I set the default license to Own work - Creative Commons CC0 Waiver in my Preferences$/) do
  visit(PreferencesPage) do |page|
    page.upload_wizard_pref_tab_element.when_present.click
    page.select_own_cc_zero_radio
    page.preferences_save_button_element.click
    page.wait_for_ajax
  end
end

When(/^I set the default license to Someone else's work - Original work of NASA in my Preferences$/) do
  visit(PreferencesPage) do |page|
    page.upload_wizard_pref_tab_element.when_present.click
    page.select_thirdparty_nasa_radio
    page.preferences_save_button_element.click
    page.wait_for_ajax
  end
end

When(/^I set the default license to Use whatever the default is in my Preferences$/) do
  visit(PreferencesPage) do |page|
    page.upload_wizard_pref_tab_element.when_present.click
    page.select_default_radio
    page.preferences_save_button_element.click
    page.wait_for_ajax
  end
end

When(/^click button Continue$/) do
  # Wait a while because this is sometimes waiting for the upload(s) to complete
  on(UploadPage).continue_element.when_present(60).click
end

When(/^I click the Next button at the Describe page$/) do
  on(DescribePage) do |page|
    page.next_element.click
    page.wait_for_ajax
  end
end

When(/^I click the Skip checkbox$/) do
  on(LearnPage) do |page|
    page.highlighted_step_heading_element.when_present
    if browser.driver.browser == :chrome
      # ChromeDriver can't click on the element because of a bug in the driver
      # related to automatic scrolling to out-of-view elements taking time
      # Reported here: https://code.google.com/p/selenium/issues/detail?id=8528
      browser.execute_script("$( '#mwe-upwiz-skip' ).click();")
    else
      page.check_tutorial_skip
    end
  end
end

When(/^I click the Next button at the Learn page$/) do
  on(LearnPage) do |page|
    page.highlighted_step_heading_element.when_present
    if browser.driver.browser == :chrome
      # Same Chrome issue as above
      browser.execute_script("$( '#mwe-upwiz-stepdiv-tutorial .mwe-upwiz-button-next' ).click();")
    else
      page.next_element.click
    end
    page.wait_for_ajax
  end
end

When(/^I click the Next button at the Release rights page$/) do
  on(ReleaseRightsPage) do |page|
    page.next_element.click
    page.wait_for_ajax # Clicking Next fetches data about each file through AJAX
  end
  on(DescribePage).highlighted_step_heading_element.when_present
end

When(/^I click This file is my own work$/) do
  on(ReleaseRightsPage) do |page|
    page.highlighted_step_heading_element.when_present
    sleep 1 # Sleep because of annoying JS animation happening in this menu
    page.my_own_work_element.when_present.click
    sleep 1 # Sleep because of annoying JS animation happening in this menu
  end
end

When(/^I click Provide copyright information for each file$/) do
  on(ReleaseRightsPage) do |page|
    page.highlighted_step_heading_element.when_present
    sleep 1 # Sleep because of annoying JS animation happening in this menu
    on(ReleaseRightsPage).select_provide_copyright_information
    sleep 1 # Sleep because of annoying JS animation happening in this menu
  end
end

When(/^I enter category$/) do
  on(DescribePage).category = "Test"
end

When(/^I enter date$/) do
  on(DescribePage).date_created = "11/4/2014"
  sleep 0.5 # Sleep because of annoying JS animation happening in the date picker
end

When(/^I enter description$/) do
  on(DescribePage).description = "description"
end

When(/^I enter title$/) do
  on(DescribePage).title = "Title #{Random.new.rand}"
end

When(/^I enter metadata (\S+) (.+)$/) do |fieldname, value|
  on(DescribePage).set_field(fieldname, value)
end

When(/^I navigate to Upload Wizard$/) do
  visit UploadWizardPage
end

When(/^thumbnail should be visible$/) do
  on(ReleaseRightsPage).thumbnail_element.when_present.should be_visible
end

When(/^there should be (\d+) uploads$/) do |countStr|
  count = countStr.to_i
  uploads = on(UploadPage).uploads
  uploads.length.should eql(count)
end

When(/^I add file (\S+)$/) do |filename|
  shade = Random.new.rand(255)
  width = Random.new.rand(255)
  height = Random.new.rand(255)
  path = make_temp_image(filename, shade, width, height)
  on(UploadPage).add_file(path)
end

When(/^I add file (\S+) with (\d+)% black, (\d+)px x (\d+)px$/) do |filename, shadeStr, widthStr, heightStr|
  shade = ((shadeStr.to_i / 100.0) * 255).round
  width = widthStr.to_i
  height = heightStr.to_i
  path = make_temp_image(filename, shade, width, height)
  on(UploadPage).add_file(path)
end

When(/^I remove file (.+)$/) do |filename|
  on(UploadPage) do |page|
    page.remove_file(filename)
  end
end

When(/^I wait for the upload interface to be present$/) do
  on(UploadPage).select_file_control_to_wait_for_element.when_present
end

When(/^I click Use a different license for the first file$/) do
  on(DescribePage).use_a_different_license_element.when_present.click
end

When(/^I click Upload more files button at Use page$/) do
  on(UsePage).upload_more_files_element.when_present(15).click
end

When(/^I click Copy information to all uploads below$/) do
  on(DescribePage).copy_expand_element.when_present(15).click
end

When(/^I check Title$/) do
  on(DescribePage).check_title_check
end

When(/^I check Descriptions$/) do
  on(DescribePage).check_description_check
end

When(/^I check Date$/) do
  on(DescribePage).check_date_check
end

When(/^I check Categories$/) do
  on(DescribePage).check_categories_check
end

When(/^I click the Copy button$/) do
  on(DescribePage) do |page|
    page.copy_element.when_present(15).click
    page.wait_for_ajax
  end
end

When(/^I uncheck all of the copy checkboxes$/) do
  on(DescribePage).title_check_element.when_present(10).uncheck
  on(DescribePage).description_check_element.when_present(10).uncheck
  on(DescribePage).date_check_element.when_present(10).uncheck
  on(DescribePage).categories_check_element.when_present(10).uncheck
  on(DescribePage).other_check_element.when_present(10).uncheck
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
  browser.url.should match /Special:UploadWizard/
end

Then(/^Learn page should appear$/) do
  browser.url.should match /Special:UploadWizard/
end

Then(/^Release rights page should open$/) do
  browser.url.should match /Special:UploadWizard/
end

Then(/^title text field should be there$/) do
  on(DescribePage).title_element.when_present.should be_visible
end

Then(/^Upload more files button should be there$/) do
  on(UsePage) do |page|
    page.highlighted_step_heading_element.when_present(15)
    page.upload_more_files_element.when_present.should be_visible
  end
end

Then(/^Upload page should appear$/) do
  browser.url.should match /Special:UploadWizard/
end

Then(/^there should be an upload for (\S+)$/) do |filename|
  on(UploadPage).upload?(filename).should eq(true)
end

Then(/^a duplicate name error should appear$/) do
  on(UploadPage).duplicate_error_element.when_present.should be_visible
end

Then(/^Creative Commons CC0 Waiver should be checked for the first file$/) do
  on(DescribePage).own_cc_zero_radio_selected?.should eq(true)
end

Then(/^Creative Commons Attribution ShareAlike 4.0 should be checked for the first file$/) do
  on(DescribePage).own_cc_by_sa_4_radio_selected?.should eq(true)
end

Then(/^Original work of NASA should be checked for the first file$/) do
  on(DescribePage).thirdparty_nasa_radio_selected?.should eq(true)
end

Then(/^The Release rights radio buttons should be unchecked$/) do
  on(DescribePage) do |page|
    page.own_work_radio_selected?.should eq(false)
    page.thirdparty_radio_selected?.should eq(false)
  end
end

Then(/^upload number (\d+) should have a (\S+)$/) do |index, fieldname|
  on(DescribePage).field_filled?(index, fieldname).should == true
end

Then(/^upload number (\d+) should have the (\S+) (.+)$/) do |index, fieldname, value|
  on(DescribePage).field_value(index, fieldname).should == value
end

Then(/^I should be scrolled to the (\S+) field$/) do |field|
  on(DescribePage).field(1, field).should be_present
end

Then(/^the (\S+) field should have a warning next to it$/) do |field|
  on(DescribePage).field(1, field).parent.div(css: ".mwe-upwiz-details-input-error").should be_visible
end
