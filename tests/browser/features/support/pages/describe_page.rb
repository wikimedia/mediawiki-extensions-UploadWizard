class DescribePage
  include PageObject

  page_url 'Special:UploadWizard'

  li(:highlighted_step_heading, xpath: "//ul[@id='mwe-upwiz-steps']/li[@id='mwe-upwiz-step-details'][@class='arrow head']")
  text_field(:category, id: "categories0")
  text_field(:date_created, id: "dateInput0")
  textarea(:description, name: /^description/)
  div(:next_parent, id: "mwe-upwiz-stepdiv-details")
  span(:next) do |page|
    page.next_parent_element.span_element(text: "Next")
  end
  text_field(:title, id: "title0")

  checkbox(:title_check, id: "mwe-upwiz-copy-title")
  checkbox(:description_check, id: "mwe-upwiz-copy-description")
  checkbox(:date_check, id: "mwe-upwiz-copy-date")
  checkbox(:categories_check, id: "mwe-upwiz-copy-categories")
  checkbox(:other_check, id: "mwe-upwiz-copy-other")

  a(:use_a_different_license, xpath: "//div[@id='mwe-upwiz-stepdiv-details']//form[@id='mwe-upwiz-detailsform0']//p[@class='mwe-more-options']/a")

  radio(:own_cc_zero_radio, value: "{{self|cc-zero}}")
  radio(:thirdparty_nasa_radio, value: "{{PD-USGov-NASA}}")
  radio(:own_cc_by_sa_4_radio, value: "{{self|cc-by-sa-4.0}}")
  radio(:own_work_radio, id: "deedChooser2-ownwork")
  radio(:thirdparty_radio, id: "deedChooser2-thirdparty")

  span(:copy_expand) do |page|
    page.next_parent_element.link_element(text: "Copy information to all uploads below ...")
  end
  span(:copy) do |page|
    page.next_parent_element.button_element(id: "mwe-upwiz-copy-metadata-button")
  end

  def div_at_index(index)
    browser.div(xpath: "//div[@class='mwe-upwiz-info-file ui-helper-clearfix filled'][" + index.to_s + "]")
  end

  def field(index, fieldname)
    case fieldname
    when "description" then div_at_index(index).textarea(css: 'textarea.mwe-upwiz-desc-lang-text')
    when "date" then div_at_index(index).text_field(css: 'input.mwe-date')
    when "category" then div_at_index(index).text_field(css: 'input.categoryInput')
    when "title" then div_at_index(index).text_field(css: 'input.mwe-title')
    end
  end

  def field_value(index, fieldname)
    if index != '1' && fieldname == 'category'
      div_at_index(index).li(xpath: './/li[@class="cat"]').text
    else
      field(index, fieldname).value
    end
  end

  # Check if a field exists and is non-empty for a given filename
  def field_filled?(index, fieldname)
    field_value(index, fieldname) != ''
  end

  # Add value to a field on the first upload
  def set_field(fieldname, value)
    field('1', fieldname).value = value
  end
end
