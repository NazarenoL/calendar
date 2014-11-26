/*
* jQuery NLCalendar plugin
* A plugin made for a FEE interview process.
* by Nazareno Lorenzo
*
* It was designed in order to be able to use it as a component, that may be used in one OR MORE block elements of a 
* page. It doesn't requires any code inside of the starting element, as it renders the whole structure.
* 
* It's contructor supports an optional settings parameter. Two settings are supported: startHour and endHour, which
* receives an integer as an input.
* If they aren't defined, it defaults to {startHour:9, endHour:21}.
*/
(function ($) {

  //NLCalendar constructor
  $.NLCalendar = function(element, options) {
    this.element = element;
    $(element).addClass('NLCalendar');

    /*
     * Supports 2 options, startHour and endHour (Both are optional).
     * Both receives an integer.
     */
    //Define default values. 
    var defaults = {
      'startHour' : 9,
      'endHour'   : 21
    }
    //Merge the default settings with the options passed (if any)
    this.settings = $.extend({}, defaults, options);

    //Render the plugin and prepare to receive data.
    this.init();
  }

  /*
   * I declare all the class methods in the prototype, instead of in the function, to avoid them being re-created on
   * each Instantialization.
   */
  $.NLCalendar.prototype = {

    init: function() {
      //Empty the element
      $(this.element).empty();

      //Render the hours sidebar
      this.renderHours(this.element);

      this.renderEventsContainer(this.element);
    },

    /*
     * Calculates how many half-hour blocks will be rendered
     */
    numberOfBlocks: function(){
      //For each half hour between start and end hours add a block
      return (this.settings.endHour - this.settings.startHour) * 2;
    },

    /*
     * Creates an <ul> with each hour block in the following format:
     *   <li>
     *     9 <span class="am-pm">AM</span>
     *   </li>
     */
    renderHours: function(el) {
      var ul = $("<ul>", {class: "hours"});
      var blockIsHalfHour = 0;

      for (var i = 0; i <= this.numberOfBlocks() ; i++) {

        var isPM = false; //Default value. Could be replaced later
        var hour = this.settings.startHour + Math.floor(i/2);
        if(hour == 12){
          isPM = true;
        }else if(hour > 12){
          isPM = true;
          hour = hour - 12;
        }
        var strHour = hour.toString() + ((blockIsHalfHour) ? ':30' : ':00'); 
        
        var li = $("<li>").text(strHour + " ");

        if(blockIsHalfHour){
          li.addClass('half-hour');
        }else{
          var spanAmPm = $("<span>",{class:'am-pm'});
          spanAmPm.text((isPM) ? 'PM' : 'AM');

          li.append(spanAmPm);
        }

        ul.append(li);

        //Change the blockIsHalfHour for the next iteration
        blockIsHalfHour = 1-blockIsHalfHour;
      };

      //Append it to the element
      $(el).append(ul);
    },

    /*
     * Helper function to sort an array by the interval start 
     */
    sortStart: function() {
      return function(a,b){
        if (a['start'] > b['start']){
          return 1;
        
        }else if (a['start'] < b['start']){
          return -1;
        }
      return 0;//Same start time
      }
    },

    /*
     * Creates a <div> to contain all the scheduled events
     */
    renderEventsContainer: function(el) {

      var div = $("<div>", {class: "eventsContainer"})
        .height(this.numberOfBlocks() * 30); //Define the height

      var ul = $("<ul>", {class: "events"});

      div.append(ul);
      $(el).append(div);

      //Save it in the class
      this.eventsElement = $(el).find(".events");
    },

    eventsOverlap: function(eventA, eventB){
      if( (eventA.start < eventB.end && eventB.start < eventA.end )
        || (eventA.start == eventB.start && eventA.end == eventB.end)
      ){
        return true;
      }else{
        return false;
      }
    },
    printAndResetGroup: function(group){
      var eventsContainer = this.eventsElement;

      if(typeof group.events != 'undefined'){
        $.each(group.events, function(gIndex, gValue) {
          var columnWidth = Math.round( (100/group.columns.length) * 100 ) / 100;
          var event = $("<li>", {class: "event"})
            .width(columnWidth +"%")
            .height((gValue.end - gValue.start) + "px")
            .css({
              'top'  : gValue.start + 'px',
              'left' : (gValue.column) * (columnWidth) +"%" 
            })
            .html('<strong class="title">Sample Item</strong><br /><span class="location">Sample Location</span>');

          eventsContainer.append(event);
        });
      }
      return {
        'maxHour' : -1,
        'events' : [],
        'columns' : [] //Here I'll save an array with one item per column, with its last value
      };
    },
    /*
     * Replace all the day events by the new set passed
     */
    renderEvents: function(events) {
      var self = this; //The reference is lost inside of the $.each() loops
      var eventsContainer = this.eventsElement;

      //Delete previous events
      eventsContainer.empty();

      events.sort(this.sortStart()); //Sort by start time

      var group = {
        'maxHour' : -1
      }
      var numberOfColumns = 0;
      $.each(events, function(eventIndex, eventValue) {
        /* 
         * If this event doesn't overlap with previous events, we add them to the HTML and reset it as they
         * won't overlap with any other event (Avoiding unnecesary extra cycles)
         */
        if(eventValue.start >= group.maxHour){
          group = self.printAndResetGroup(group);
          numberOfColumns = 0;
        }

        var columnForThisEvent = numberOfColumns;

        //Check if this is the event that ends later, and in that case, save it as the maxHour
        group.maxHour = Math.max(group.maxHour, eventValue.end);

        var needNewColumn = true;
        $.each(group.columns, function(columnIndex, columnEnd) {
          if(eventValue.start > columnEnd) {
            columnForThisEvent = columnIndex;
            needNewColumn = false;
            return false;//Break from $.each
          } 
        });
        
        group.columns[columnForThisEvent] = eventValue.end;
        if(needNewColumn){
          numberOfColumns++;
        }

        group.events.push({
          'index' : eventIndex,
          'start' : eventValue.start,
          'end' : eventValue.end,
          'column' : columnForThisEvent
        });

      });
      self.printAndResetGroup(group);
    }
  };

  // Attach the function as a jQuery plugin
  $.fn.NLCalendar = function(options) {

    /*
     * Save the instance in the element's data-NLCalendar attribute, to be able to
     * recover the instance and execute it's methods once initiated using:
     * element.data('NLCalendar').method(arguments)
     */
    if (undefined == $(this).data('NLCalendar')) { // Check if the plugin was already attached to this element

      var plugin = new $.NLCalendar(this, options); // Create a new instance of the plugin

      $(this).data('NLCalendar', plugin); //Save it in data-NLCalendar

      return plugin;
    }


  }

})(jQuery);

/* 
 * One of the requirements is to have a public layOutDay() function.
 */
function layOutDay(events){
  calendar.renderEvents(events);
}

/*
* Apply it to a block and lay out some events
*/
var calendar = $(".calendar").NLCalendar({startHour:9, endHour:21});

///Lay out the sample settings
layOutDay( [{start: 30, end: 150},{start: 540, end: 600},{start: 560, end: 620},{start: 610, end: 670}] );

