/*
  Backform
  http://github.com/amiliaapp/backform

  Copyright (c) 2014 Amilia Inc.
  Written by Martin Drapeau
  Licensed under the MIT @license
 */
(function() {

  // Backform namespace and global options
  Backform = {
    // HTML markup global class names. More can be added by individual controls
    // using _.extend. Look at RadioControl as an example.
    formClassName: "backform form-horizontal",
    groupClassName: "form-group",
    controlLabelClassName: "control-label col-sm-4",
    controlsClassName: "col-sm-8",
    controlClassName: "form-control",
    helpClassName: "help-block",
    errorClassName: "has-error",
    helpMessageClassName: "help-block",

    // Bootstrap 2.3 adapter
    bootstrap2: function() {
      _.extend(Backform, {
        groupClassName: "control-group",
        controlLabelClassName: "control-label",
        controlsClassName: "controls",
        controlClassName: "input-xlarge",
        helpClassName: "text-error",
        errorClassName: "error",
        helpMessageClassName: "help-message small"
      });
      _.each(Backform, function(value, name) {
        if (_.isFunction(Backform[name]) &&
            _.isFunction(Backform[name].prototype["bootstrap2"]))
          Backform[name].prototype["bootstrap2"]();
      });
    },
    // https://github.com/wyuenho/backgrid/blob/master/lib/backgrid.js
    resolveNameToClass: function(name, suffix) {
      if (_.isString(name)) {
        var key = _.map(name.split('-'), function(e) {
          return e.slice(0, 1).toUpperCase() + e.slice(1);
        }).join('') + suffix;
        var klass = Backform[key];
        if (_.isUndefined(klass)) {
          throw new ReferenceError("Class '" + key + "' not found");
        }
        return klass;
      }
      return name;
    }
  };

  // Backform Form view
  // A collection of field models.
  var Form = Backform.Form = Backbone.View.extend({
    fields: undefined,
    errorModel: undefined,
    tagName: "form",
    className: function() {
      return Backform.formClassName;
    },
    initialize: function(options) {
      if (!(options.fields instanceof Backbone.Collection))
        options.fields = new Fields(options.fields || this.fields);
      this.fields = options.fields;
      this.model.errorModel = options.errorModel || this.model.errorModel || new Backbone.Model();
    },
    render: function() {
      this.$el.empty();

      var form = this,
          $form = this.$el,
          model = this.model;

      this.fields.each(function(field) {
        var control = new (field.get("control"))({
          field: field,
          model: model
        });
        $form.append(control.render().$el);
      });

      return this;
    }
  });

  // Field model and collection
  // A field maps a model attriute to a control for rendering and capturing user input
  var Field = Backform.Field = Backbone.Model.extend({
    defaults: {
      name: "", // Name of the model attribute; accepts "." nested path (e.g. x.y.z)
      placeholder: "",
      disabled: false,
      required: false,
      value: undefined, // Optional. Default value when model is empty.
      control: undefined // Control name or class
    },
    initialize: function() {
      var control = Backform.resolveNameToClass(this.get("control"), "Control");
      this.set({control: control}, {silent: true});
    }
  });

  var Fields = Backform.Fields = Backbone.Collection.extend({
    model: Field
  });


  // Base Control class
  var Control = Backform.Control = Backbone.View.extend({
    defaults: {}, // Additional field defaults
    className: function() {
      return Backform.groupClassName;
    },
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%-label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '  <span class="<%=Backform.controlClassName%> uneditable-input"><%=value%></span>',
      '</div>'
    ].join("\n")),
    initialize: function(options) {
      this.field = options.field; // Back-reference to the field

      var attrArr = this.field.get('name').split('.');
      var name = attrArr.shift();

      this.listenTo(this.model, "change:" + name, this.render);
      if (this.model.errorModel instanceof Backbone.Model)
        this.listenTo(this.model.errorModel, "change:" + name, this.updateInvalid);
    },
    getValueFromDOM: function() {
      return this.$el.find(".uneditable-input").text();
    },
    onChange: function(e) {
      var model = this.model,
          $el = $(e.target),
          attrArr = this.field.get("name").split('.'),
          name = attrArr.shift(),
          path = attrArr.join('.'),
          value = this.getValueFromDOM(),
          changes = {};

      if (this.model.errorModel instanceof Backbone.Model) {
        if (_.isEmpty(path)) {
          this.model.errorModel.unset(name);
        } else {
          var nestedError = this.model.errorModel.get(name);
          if (nestedError) {
            this.keyPathSetter(nestedError, path, null);
            this.model.errorModel.set(name, nestedError);
          }
        }
      }

      changes[name] = _.isEmpty(path) ? value : _.clone(model.get(name)) || {};

      if (!_.isEmpty(path)) this.keyPathSetter(changes[name], path, value);
      this.stopListening(this.model, "change:" + name, this.render);
      model.set(changes);
      this.listenTo(this.model, "change:" + name, this.render);
    },
    render: function() {
      var field = _.defaults(this.field.toJSON(), this.defaults),
          attributes = this.model.toJSON(),
          attrArr = field.name.split('.'),
          name = attrArr.shift(),
          path = attrArr.join('.'),
          value = this.keyPathAccessor(attributes[name], path),
          data = _.extend(field, {value: value, attributes: attributes});

      this.$el.html(this.template(data)).addClass(field.name);
      this.updateInvalid();
      return this;
    },
    clearInvalid: function() {
      this.$el.removeClass(Backform.errorClassName)
        .find("." + Backform.helpClassName + ".error").remove();
      return this;
    },
    updateInvalid: function() {
      var errorModel = this.model.errorModel;
      if (!(errorModel instanceof Backbone.Model)) return this;

      this.clearInvalid();

      var attrArr = this.field.get('name').split('.'),
          name = attrArr.shift(),
          path = attrArr.join('.'),
          error = errorModel.get(name);

      if (_.isEmpty(error)) return;
      if (_.isObject(error)) error = this.keyPathAccessor(error, path);
      if (_.isEmpty(error)) return;

      this.$el.addClass(Backform.errorClassName);
      this.$el.find("." + Backform.controlsClassName)
        .append('<span class="' + Backform.helpClassName + ' error">' + (_.isArray(error) ? error.join(", ") : error) + '</span>');

      return this;
    },
    keyPathAccessor: function(obj, path) {
      var res = obj;
      path = path.split('.');
      for (var i = 0; i < path.length; i++) {
        if (_.isEmpty(path[i])) continue;
        if (!_.isUndefined(res[path[i]])) res = res[path[i]];
      }
      return _.isObject(res) && !_.isArray(res) ? null : res;
    },
    keyPathSetter: function(obj, path, value) {
      path = path.split('.');
      while (path.length > 1) {
        obj = obj[path.shift()];
      }
      return obj[path.shift()] = value;
    }
  });

  // Built-in controls

  var UneditableInputControl = Backform.UneditableInputControl = Control;

  var HelpControl = Backform.HelpControl = Control.extend({
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>">&nbsp;</label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '  <span class="<%=Backform.helpMessageClassName%> help-block"><%=label%></span>',
      '</div>'
    ].join("\n"))
  });

  var SpacerControl = Backform.SpacerControl = Control.extend({
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>">&nbsp;</label>',
      '<div class="<%=Backform.controlsClassName%>"></div>'
    ].join("\n"))
  });

  var TextareaControl = Backform.TextareaControl = Control.extend({
    defaults: {
      label: "",
      maxlength: 4000,
      extraClasses: [],
      helpMessage: ""
    },
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%-label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '  <textarea class="<%=Backform.controlClassName%> <%=extraClasses.join(\' \')%>" name="<%=name%>" maxlength="<%=maxlength%>" placeholder="<%-placeholder%>" <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%>><%-value%></textarea>',
      '  <% if (helpMessage.length) { %>',
      '    <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      '  <% } %>',
      '</div>'
    ].join("\n")),
    events: {
      "change textarea": "onChange",
      "focus textarea": "clearInvalid"
    },
    getValueFromDOM: function() {
      return this.$el.find("textarea").val();
    }
  });

  var SelectControl = Backform.SelectControl = Control.extend({
    defaults: {
      label: "",
      options: [], // List of options as [{label:<label>, value:<value>}, ...]
      extraClasses: []
    },
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%-label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '  <select class="<%=Backform.controlClassName%> <%=extraClasses.join(\' \')%>" name="<%=name%>" value="<%-JSON.stringify(value)%>" <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> >',
      '    <% for (var i=0; i < options.length; i++) { %>',
      '      <% var option = options[i]; %>',
      '      <option value="<%-JSON.stringify(option.value)%>" <%=option.value == value ? "selected=\'selected\'" : ""%>><%-option.label%></option>',
      '    <% } %>',
      '  </select>',
      '</div>'
    ].join("\n")),
    events: {
      "change select": "onChange",
      "focus select": "clearInvalid"
    },
    getValueFromDOM: function() {
      return JSON.parse(this.$el.find("select").val());
    }
  });

  var InputControl = Backform.InputControl = Control.extend({
    defaults: {
      type: "text",
      label: "",
      maxlength: 255,
      extraClasses: [],
      helpMessage: ''
    },
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%-label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '  <input type="<%=type%>" class="<%=Backform.controlClassName%> <%=extraClasses.join(\' \')%>" name="<%=name%>" maxlength="<%=maxlength%>" value="<%-value%>" placeholder="<%-placeholder%>" <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> />',
      '  <% if (helpMessage.length) { %>',
      '    <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      '  <% } %>',
      '</div>'
    ].join("\n")),
    events: {
      "change input": "onChange",
      "focus input": "clearInvalid"
    },
    getValueFromDOM: function() {
      return this.$el.find("input").val();
    }
  });

  var BooleanControl = Backform.BooleanControl = InputControl.extend({
    defaults: {
      type: "checkbox",
      label: "",
      extraClasses: []
    },
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>">&nbsp;</label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '  <div class="checkbox">',
      '    <label>',
      '      <input type="<%=type%>" class="<%=extraClasses.join(\' \')%>" name="<%=name%>" <%=value ? "checked=\'checked\'" : ""%> <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> /> <%-label%>',
      '    </label>',
      '  </div>',
      '</div>'
    ].join("\n")),
    getValueFromDOM: function() {
      return this.$el.find("input").is(":checked");
    }
  });

  var CheckboxControl = Backform.CheckboxControl = BooleanControl;

  var RadioControl = Backform.RadioControl = InputControl.extend({
    defaults: {
      type: "radio",
      label: "",
      options: [],
      extraClasses: []
    },
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%-label%></label>',
      '<div class="<%=Backform.controlsClassName%> <%=Backform.radioControlsClassName%>">',
      '  <% for (var i=0; i < options.length; i++) { %>',
      '    <% var option = options[i]; %>',
      '    <label class="<%=Backform.radioLabelClassName%>">',
      '      <input type="<%=type%>" class="<%=extraClasses.join(\' \')%>" name="<%=name%>" value="<%-JSON.stringify(option.value)%>" <%=value == option.value ? "checked=\'checked\'" : ""%> <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> /> <%-option.label%>',
      '    </label>',
      '  <% } %>',
      '</div>'
    ].join("\n")),
    getValueFromDOM: function() {
      return JSON.parse(this.$el.find("input:checked").val());
    },
    bootstrap2: function() {
      Backform.radioControlsClassName = "controls";
      Backform.radioLabelClassName = "radio inline";
    }
  });
  _.extend(Backform, {
    radioControlsClassName: "checkbox",
    radioLabelClassname: "checkbox-inline"
  });

  // Requires the Bootstrap Datepicker to work.
  var DatepickerControl = Backform.DatepickerControl = InputControl.extend({
    defaults: {
      type: "text",
      label: "",
      options: {},
      extraClasses: [],
      maxlength: 255,
      helpMessage: ''
    },
    events: {
      "changeDate input": "onChange",
      "focus input": "clearInvalid"
    },
    render: function() {
      InputControl.prototype.render.apply(this, arguments);
      this.$el.find("input").datepicker(this.field.get("options"));
      return this;
    }
  });

  var ButtonControl = Backform.ButtonControl = Control.extend({
    defaults: {
      type: "submit",
      label: "Submit",
      status: undefined, // error or success
      message: undefined,
      extraClasses: []
    },
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>">&nbsp;</label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '  <button type="<%=type%>" name="<%=name%>" class="btn <%=extraClasses.join(\' \')%>" <%=disabled ? "disabled" : ""%> ><%-label%></button>',
      '  <% var cls = ""; if (status == "error") cls = Backform.buttonStatusErrorClassName; if (status == "success") cls = Backform.buttonStatusSuccessClassname; %>',
      '  <span class="status <%=cls%>"><%=message%></span>',
      '</div>'
    ].join("\n")),
    initialize: function() {
      Control.prototype.initialize.apply(this, arguments);
      this.listenTo(this.field, "change:status", this.render);
      this.listenTo(this.field, "change:message", this.render);
    },
    bootstrap2: function() {
      Backform.buttonStatusErrorClassName = "text-error";
      Backform.buttonStatusSuccessClassname = "text-success";
    }
  });
  _.extend(Backform, {
    buttonStatusErrorClassName: "text-danger",
    buttonStatusSuccessClassname: "text-success"
  });

}).call(this);
