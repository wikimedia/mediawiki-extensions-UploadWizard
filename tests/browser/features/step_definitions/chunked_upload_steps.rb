Given(/^I am on the file upload step$/) do
  visit(UploadWizardPage) do |page|
    # if we are on the learn step, move to next step, otherwise do nothing
    if page.stepdiv_file_element.visible? == false
      step "I click the Next button at the Learn page"
    end
  end
end

And(/^chunked upload is enabled in my preferences$/) do
  # quite a nasty hack. Faster than actually enabling and reloading, though, and does not have race conditions
  browser.execute_script('mw.UploadWizard.config.enableChunked = true;')
end

When(/^I upload a large file$/) do
  path = create_large_image(11_000_000)
  on(UploadPage).add_file(path)
end

Then(/^the upload should finish$/) do
  on(UploadPage).continue_element.when_present(300).should be_visible
end
