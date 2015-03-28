# Main wiki page, where we land after logging in
class MainPage
  include PageObject

  page_url 'Main_Page'

  div(:tutorial_preference_set, id: "cucumber-tutorial-preference-set")
end
