class LearnPage
  include PageObject

  page_url 'Special:UploadWizard'

  div(:tutorial, id: "mwe-upwiz-stepdiv-tutorial")

  span(:next) do |page|
    page.tutorial_element.span_element(text: "Next")
  end
  checkbox(:tutorial_skip, id: "mwe-upwiz-skip")
  li(:highlighted_step_heading, xpath: "//ul[@id='mwe-upwiz-steps']/li[@id='mwe-upwiz-step-tutorial'][@class='arrow head']")
end
