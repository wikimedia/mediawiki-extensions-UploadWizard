When(/^I click the Flickr import button$/) do
  on(UploadPage).flickr_button_element.when_present.click
end

When(/^I enter (.+) as the Flickr URL$/) do |url|
  on(UploadPage).flickr_url_element.when_present.value = url
end

When(/^I click the Get from Flickr button$/) do
  on(UploadPage).flickr_get_button_element.when_present.click
end

When(/^I click Flickr upload (\d+)$/) do |index|
  modifier = Selenium::WebDriver::Platform.os == :macosx ? :command : :control
  on(UploadPage).flickr_upload(index).when_present.click(modifier)
end

When(/^I click the Upload selected images button$/) do
  on(UploadPage).flickr_select_button_element.when_present.click
end

When(/^I don't have Flickr upload rights$/) do
  @browser.execute_script('mw.UploadWizard.config.UploadFromUrl = false;')
end

Then(/^the Flickr uploads have the correct information$/) do
  # Unfortunately flickr upload order isn't guaranteed because of chained async API calls, hence why we need this conditional
  if on(DescribePage).field_value(1, "title") == "Phytotaxa.173.1.4"
    first_index = "1"
    second_index = "2"
  else
    first_index = "2"
    second_index = "1"
  end

  step "upload number " + first_index + " should have the title Phytotaxa.173.1.4"
  step "upload number " + first_index + " should have the description Image extracted from: Rikkinen,"\
  " J., Tuovila, H., Beimforde, C., Seyfullah, L., Perrichot, V., & Schmidt, A. R. (2014). "\
  "Chaenothecopsis neocaledonica sp. nov.: The first resinicolous mycocalicioid fungus from an "\
  "araucarian conifer. Phytotaxa, 173(1), 49. doi:10.11646/phytotaxa.173.1.4 licensed under the "\
  "Creative Commons Attribution Licence (CC-BY) creativecommons.org/licenses/by/3.0"
  step "upload number " + first_index + " should have the date 2014-06-24 06:06:43"
  step "upload number " + second_index + " should have the title Phytotaxa.173.1.9"
  step "upload number " + second_index + " should have the description Image extracted from: Qiu, Q.,"\
  " Wei, Y.-M., Cheng, X.-F., & Zhu, R.-L. (2014). Notes on Early Land Plants Today. 57. Cheilolejeunea "\
  "boliviensis and Cheilolejeunea savesiana, two new synonyms in Lejeunea (Marchantiophyta, Lejeuneaceae)"\
  " . Phytotaxa, 173(1), 88. doi:10.11646/phytotaxa.173.1.9 licensed under the Creative Commons "\
  "Attribution Licence (CC-BY) creativecommons.org/licenses/by/3.0"
  step "upload number " + second_index + " should have the date 2014-06-24 06:07:07"
end

Then(/^the Flickr import button should be absent$/) do
  on(UploadPage).flickr_button_element.visible?.should == false
end
