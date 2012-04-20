###
# AirCasting - Share your Air!
# Copyright (C) 2011-2012 HabitatMap, Inc.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
# You can contact the authors by email at <info@habitatmap.org>
###
AirCasting.Views.Maps ||= {}

class AirCasting.Views.Maps.SessionListView extends Backbone.View
  MAX_POINTS = 30000

  stream_option: JST["backbone/templates/maps/sensor_item"]

  initialize: (options) ->
    super(options)
    @googleMap = options.googleMap
    @collection.bind('reset', @render.bind(this))
    @selectedSessions = {}
    @downloadedData = {}
    @markers = []
    @notes = []
    @lines = []
    @fetchingData = 0

    @infoWindow = new google.maps.InfoWindow()
    google.maps.event.addListener(@infoWindow, "domready", =>
      $(".lightbox").lightBox()
      $(".prev-note").unbind("click")
      $(".next-note").unbind("click")
      $(".prev-note").click( => @prevNote())
      $(".next-note").click( => @nextNote())
    )

    @graphView = new AirCasting.Views.Maps.GraphView(el: $("section.graph"), googleMap: @googleMap, parent: this)

  render: ->
    $(@el).empty()

    @itemViews = {}

    @collection.each (session) =>
      id = session.get("id")
      if id in @options.selectedIds
        @selectedSessions[id] = session
        @fetchData(id)

      itemView = new AirCasting.Views.Maps.SessionListItemView(
        model: session,
        parent: this,
        selected: @selectedSessions[id]?
      )
      @itemViews[id] = itemView
      $(@el).append itemView.render().el

    @updateToggleAll()
    @options.selectedIds = _.filter(@options.selectedIds, (x) => !@selectedSessions[x])

    this

  onChildSelected: (childView, selected) ->
    session = childView.model
    sessionId = session.get('id')

    if selected
      @selectSensor(session)

    if selected && @sumOfSelected() > MAX_POINTS
      @tooManySessions()
      childView.unselect()
    else if selected
      @selectedSessions[sessionId] = childView.model
    else
      @hideSession(sessionId)

    if @numberOfSelected != 1
      @graphView.disableGraph()

    @updateToggleAll()

  sensor: (stream) ->
    new AirCasting.Models.Sensor(measurement_type: stream.measurement_type, sensor_name: stream.sensor_name)

  selectSensor: (session) ->
    streams = session.get("streams")
    if streams.length == 1
      @selectedSensor = @sensor(_.first(streams))
    else
      @displaySensorDialog(session)

  displaySensorDialog: (session) ->
    content = $('<div><p>Select sensor stream to display</p><select id="sensors"></select></div>')

    sensors = new AirCasting.Collections.SensorCollection()
    sensors.add(@sensor(stream)) for stream in session.get('streams')

    sensors.each (sensor) =>
      rendered = @stream_option(sensor: sensor, selected: false)
      content.find("#sensors").append(rendered)

    dialog = $(content).dialog(modal: true, title: "Select sensor", close: => @unselectSession(session.get('id')))
    dialog.dialog("option", "buttons", {
      "OK": =>
        cid = dialog.find(":selected").attr("value")
        @selectedSensor = sensors.getByCid(cid)

        dialog.dialog("destroy")

        @fetchAndDraw(session.get('id'))
    })

  unselectSession: (sessionId) ->
    @itemViews[sessionId].unselect()

  fetchAndDraw: (sessionId) ->
    if @downloadedData[sessionId]
      @drawSession(sessionId)
      @adjustViewport()
    else
      @fetchData(sessionId, => @adjustViewport())

  sumOfSelected: ->
    sessions = (session for key, session of @selectedSessions)
    @sumOfSizes(sessions)

  numberOfSelected: ->
    Object.keys(@selectedSessions).length

  hideSession: (sessionId) ->
    delete @selectedSessions[sessionId]

    @lines[sessionId]?.setMap(null)
    for marker in @markers when marker.sessionId == sessionId
      marker.setMap(null)

    oldNotes = @notes
    @notes = []
    for note in oldNotes
      if note.note.session_id == sessionId
        note.marker.setMap(null)
      else
        @notes.push(note)

    @adjustViewport()

  fetchData: (sessionId, callback) ->
    AC.util.spinner.startTask()

    $.getJSON "/api/sessions/#{sessionId}", (data) =>
      @downloadedData[sessionId] = data
      callback(data) if callback

      if @selectedSessions[sessionId]
        @drawSession(sessionId)

      AC.util.spinner.stopTask()

  selectSessionByToken: (data) ->
    @selectedSessions[data.id] = new AirCasting.Models.Session(data)

  reset: ->
    @$(':checkbox').attr('checked', null)
    @$(':checkbox').trigger('change')
    @selectedSessions = {}
    @clear()
    @draw()

  noneSelected: ->
    Object.keys(@selectedSessions).length == 0

  toggleAll: ->
    if @noneSelected()
      @selectAll()
    else
      @reset()
    @updateToggleAll()

  selectAll: ->
    size = @sumOfSizes(@collection)
    if size > MAX_POINTS
      @tooManySessions()
    else
      @$(':checkbox').attr('checked', true)
      @$(':checkbox').trigger('change')

  tooManySessions: ->
    AC.util.notice("You are trying to select too many sessions")

  sumOfSizes: (sessions) ->
    sum = (acc, session) -> acc + session.size()
    sessions.reduce(sum, 0)

  updateToggleAll: ->
    if @noneSelected()
      $("#toggle-all-sessions").text("all")
    else
      $("#toggle-all-sessions").text("none")

  clear: ->
    marker.setMap(null) for marker in @markers
    line.setMap(null) for id, line of @lines
    @markers.length = 0
    @lines.length = 0
    @notes.length = 0

  adjustViewport: ->
    north = undefined
    east = undefined
    south = undefined
    west = undefined

    for id, session of @selectedSessions when session and @downloadedData[id]
      measurements = _(@downloadedData[id].streams).map((x) -> x.measurements)
      measurements = _(measurements).flatten()
      for m in measurements
        lat = parseFloat(m.latitude)
        lng = parseFloat(m.longitude)

        north = lat if !north or lat > north
        east = lng if !east or lng > east
        south = lat if !south or lat < south
        west = lng if !west or lng < west

    if north and east
      @googleMap.adjustViewport(north, east, south, west)

  draw: ->
    for id, session of @selectedSessions when session and @downloadedData[id]
      @drawSession(id)

  currentStream: (id) ->
    streams = @downloadedData[id].streams
    stream = _(streams).find (stream) =>
      stream.measurement_type == @selectedSensor.get("measurement_type") &&
        stream.sensor_name == @selectedSensor.get("sensor_name")

    stream.measurements

  drawSession: (id) ->
    AC.util.spinner.startTask()

    session = @selectedSessions[id]
    measurements = @currentStream(id) || []
    @drawTrace(id, measurements)

    for index in [0...measurements.length]
      element = measurements[index]
      @drawMeasurement(session, element, index)
    for note in @downloadedData[id].notes || []
      @drawNote(session, note)

    if @numberOfSelected() == 1
      @graphView.drawGraph()

    AC.util.spinner.stopTask()

  drawTrace: (sessionId, measurements) ->
    points = (new google.maps.LatLng(m.latitude, m.longitude) for m in measurements)

    lineOptions =
      map: @googleMap.map
      path: points
      strokeColor: "#007bf2"
      geodesic: true

    line = new google.maps.Polyline(lineOptions)
    @lines[sessionId] = line

  drawMeasurement: (session, element, zIndex) ->
    icon = AC.util.dbToIcon(element.value)

    if icon
      markerOptions =
        map: @googleMap.map
        position: new google.maps.LatLng(element.latitude, element.longitude)
        title: '' + parseInt(element.value) + ' dB'
        icon: icon
        flat: true
        zIndex: zIndex

      marker = new google.maps.Marker()
      marker.setOptions markerOptions
      marker.sessionId = session.get('id')
      @markers.push marker

  drawNote: (session, note) ->
    markerOptions =
      map: @googleMap.map
      position: new google.maps.LatLng(note.latitude, note.longitude)
      title: note.text
      icon: window.marker_note_path
      zIndex: 200000

    marker = new google.maps.Marker
    marker.setOptions(markerOptions)
    marker.sessionId = session.get('id')

    @notes.push({note: note, marker: marker})
    noteNumber = @notes.length - 1
    google.maps.event.addListener(marker, 'click', => @displayNote(noteNumber))

    @markers.push marker

  displayNote: (noteNumber) ->
    note = @notes[noteNumber].note
    marker = @notes[noteNumber].marker

    @currentNote = noteNumber
    content = JST["backbone/templates/maps/note"]
    rendered = content({note: note, noteNumber: noteNumber, notesLength: @notes.length})
    @infoWindow.setContent(rendered)

    @infoWindow.open(@googleMap.map, marker)

  prevNote: ->
    noteNumber = @currentNote - 1
    if noteNumber < 0
      noteNumber = @notes.length - 1
    @displayNote(noteNumber)

  nextNote: ->
    noteNumber = (@currentNote + 1) % @notes.length
    @displayNote(noteNumber)
