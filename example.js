$(document).ready(function() {

  // Backform example - a person model with a nested address object
  var person = new Backbone.Model({
    id: 101,
    salutation: "Mr",
    firstName: "Andre",
    lastName: "Jones",
    adult: true,
    address: {
      address1: "1751 rue Richardson",
      address2: "Suite 3.105",
      city: "Montréal",
      postalCode: "H3K 1G6",
      province: "QC"
    },
    dateOfBirth: "1990-10-10",
    lifeGoal: "To become the best basketball player there is. I want to dunk!"
  });
  
  new Backform.Form({
    el: "#form",
    model: person,
    fields: [
      {name: "id", label: "Id", control: "uneditable-input"},
      {name: "firstName", label: "First Name", control: "input"},
      {name: "lastName", label: "Last Name", control: "input"},
      {name: "adult", label: "Adult", control: "checkbox"},
      {
        name: "salutation",
        label: "Salutation",
        control: "radio",
        options: [
          {label: "Mr.", value: "Mr"},
          {label: "Mrs.", value: "Mrs"},
          {label: "Mme.", value: "Mme"}
        ]
      },
      {control: "spacer"},
      {name: "address", nested: "address1", label: "Address1", control: "input"},
      {name: "address", nested: "address2", label: "Address2", control: "input"},
      {name: "address", nested: "city", label: "City", control: "input"},
      {name: "address", nested: "postalCode", label: "Postal Code", control: "input"},
      {
        name: "address",
        nested: "province",
        label: "Province",
        control: "select",
        options: [
          {label: "Alberta", value: "AB"},
          {label: "British Columbia", value: "BC"},
          {label: "Manitoba", value: "MB"},
          {label: "New Brunswick", value: "NB"},
          {label: "Newfoundland and Labrador", value: "NL"},
          {label: "Northwest Territories", value: "NT"},
          {label: "Nova Scotia", value: "NS"},
          {label: "Nunavut", value: "NU"},
          {label: "Ontario", value: "ON"},
          {label: "Prince Edward Island", value: "PE"},
          {label: "Québec", value: "QC"},
          {label: "Saskatchewan", value: "SK"},
          {label: "Yukon", value: "YT"}
        ]
      },
      {name: "dateOfBirth", label: "Date of birth", control: "datepicker", options: {format: "yyyy-mm-dd"}},
      {name: "lifeGoal", label: "Life goal", control: "textarea"}
    ]
  }).render();

  person.on("change", function() {
    $("#object").text(JSON.stringify(person.toJSON(), null, 2));
  }).trigger("change");

  // Example with question
  window.f = new Backform.Form({
    el: $("#form-question"),
    model: new Backbone.Model({toggle: true, years:0}),
    fields: [{
      name: "toggle",
      label: "Are you a programmer?",
      control: "radio",
      options: [{label: "Yes", value: true}, {label: "No", value: false}]
    }, {
      name: "years",
      label: "For how many years?",
      control: Backform.InputControl.extend({
        initialize: function() {
          Backform.InputControl.prototype.initialize.apply(this, arguments);
          this.listenTo(this.model, "change:toggle", this.render);
        },
        render: function() {
          if (this.model.get("toggle"))
            return Backform.InputControl.prototype.render.apply(this, arguments);
          this.$el.empty();
          return this;
        }
      })
    }]
  }).render();

  // Example with input of type email
  new Backform.Form({
    el: $("#form-email"),
    model: new Backbone.Model({email: "jonsnow@castlebla.ck", age:20}),
    fields: [{
      name: "email",
      label: "Email",
      control: "input",
      type: "email",
      required: true
    }, {
      name: "age",
      label: "Age",
      control: "input",
      type: "number",
      required: true
    }, {
      control: "button"
    }]
  }).render();

  $("#form-email").on("submit", function(e) {
    alert("Browser validation passed");
    return false;
  });

  // Example with validation
  var model = window.model = new Backbone.Model({a: 101}),
      errorModel = window.errorModel = new Backbone.Model();
  
  new Backform.Form({
    el: "#form-validation",
    model: model,
    errorModel: errorModel,
    fields: [{
      name: "a",
       label: "Choose a number between 10 and 20. Submit the form to validate.",
       control: "input"
    }, {
       control: "button"
    }]
  }).render();

  $("#form-validation").on("submit", function(e) {
    e.preventDefault();

    errorModel.clear();

    var number = parseFloat(model.get("a"), 10);
    if (isNaN(number))
      errorModel.set({a: "Not a number!"});
    else if (number <= 10 || number >= 20)
      errorModel.set({a: "Must be between 10 and 20"})

    return false;
  });

});