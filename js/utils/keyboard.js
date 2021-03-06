/**
 * @ngdoc page
 * @name keyboard
 * @module ionic
 * @description
 * On both Android and iOS, Ionic will attempt to prevent the keyboard from obscuring inputs and 
 * focusable elements when it appears by scrolling them into view.  In order for this to work,
 * any focusable elements must be within a [Scroll View](http://ionicframework.com/docs/api/directive/ionScroll/)
 * or a directive such as [Content](http://ionicframework.com/docs/api/directive/ionContent/) that has a Scroll View.
 *
 * It will also attempt to prevent the native overflow scrolling on focus, which can cause layout issues such as 
 * pushing headers up and out of view.
 *
 * The keyboard fixes work best in conjunction with the [Ionic Keyboard Plugin](https://github.com/driftyco/ionic-plugins-keyboard),
 * although it will perform reasonably well without.  However, if you are using Cordova there is no reason not to use the plugin.
 *
 * ### Hide when keyboard shows
 * 
 * To hide an element when the keyboard is open, add the class `hide-on-keyboard-open`.
 *
 * ```html
 * <div class="hide-on-keyboard-open">
 *   <div id="google-map"></div>
 * </div>
 * ```
 * ----------
 *
 * ### Plugin Usage
 * Information on using the plugin can be found at [https://github.com/driftyco/ionic-plugins-keyboard](https://github.com/driftyco/ionic-plugins-keyboard).
 *
 * ---------- 
 *
 * ### Android Notes
 * - If your app is running in fullscreen, i.e. you have `<preference name="Fullscreen" value="true" />` in your `config.xml` file
 * you will need to set `ionic.Platform.isFullScreen = true` manually.
 *
 * - You can configure the behavior of the web view when the keyboard shows by setting 
 *   [android:windowSoftInputMode](http://developer.android.com/reference/android/R.attr.html#windowSoftInputMode) to either `adjustPan`, `adjustResize` or `adjustNothing` in your app's activity in `AndroidManifest.xml`. `adjustResize` is the recommended setting for Ionic, but if for some reason you do use `adjustPan` you will need to set `ionic.Platform.isFullScreen = true`.
 *
 *   ```xml
 *   <activity android:windowSoftInputMode="adjustResize">
 *
 *   ```
 *
 * ### iOS Notes
 * - if you are not using the keyboard plugin, switching to inputs below the keyboard using the accessory bar will automatically use the native browser's
 * overflow scrolling and push headers out of view
 * 
 */

/*
IONIC KEYBOARD
---------------

*/

var keyboardViewportHeight = window.innerHeight;
var keyboardIsOpen;
var keyboardActiveElement;
var keyboardFocusOutTimer;
var keyboardFocusInTimer;
var keyboardLastShow = 0;

var KEYBOARD_OPEN_CSS = 'keyboard-open';
var SCROLL_CONTAINER_CSS = 'scroll';

ionic.keyboard = {
  isOpen: false,
  height: null,
  landscape: false,
};

function keyboardInit() {
  if( keyboardHasPlugin() ) {
    window.addEventListener('native.keyboardshow', keyboardNativeShow);
    window.addEventListener('native.keyboardhide', keyboardFocusOut);

    //deprecated
    window.addEventListener('native.showkeyboard', keyboardNativeShow);
    window.addEventListener('native.hidekeyboard', keyboardFocusOut);
  }
  else {
    document.body.addEventListener('focusout', keyboardFocusOut);
  }

  document.body.addEventListener('ionic.focusin', keyboardBrowserFocusIn);
  document.body.addEventListener('focusin', keyboardBrowserFocusIn);

  document.body.addEventListener('orientationchange', keyboardOrientationChange);

  document.removeEventListener('touchstart', keyboardInit);
}

function keyboardNativeShow(e) {
  clearTimeout(keyboardFocusOutTimer);
  ionic.keyboard.height = e.keyboardHeight;
}

function keyboardBrowserFocusIn(e) {
  if( !e.target || !ionic.tap.isTextInput(e.target) || !keyboardIsWithinScroll(e.target) ) return;

  document.addEventListener('keydown', keyboardOnKeyDown, false);

  document.body.scrollTop = 0;
  document.body.querySelector('.scroll-content').scrollTop = 0;

  keyboardActiveElement = e.target;

  keyboardSetShow(e);
}

function keyboardSetShow(e) {
  clearTimeout(keyboardFocusInTimer);
  clearTimeout(keyboardFocusOutTimer);

  keyboardFocusInTimer = setTimeout(function(){
    if ( keyboardLastShow + 350 > Date.now() ) return;
    keyboardLastShow = Date.now();
    var keyboardHeight;
    var elementBounds = keyboardActiveElement.getBoundingClientRect();
    var count = 0;

    var pollKeyboardHeight = setInterval(function(){

      keyboardHeight = keyboardGetHeight();
      if (count > 10){
        clearInterval(pollKeyboardHeight);
        //waited long enough, just guess
        keyboardHeight = 275;
      }
      if (keyboardHeight){
        keyboardShow(e.target, elementBounds.top, elementBounds.bottom, keyboardViewportHeight, keyboardHeight);
        clearInterval(pollKeyboardHeight);
      }
      count++;

    }, 100);
  }, 32);
}

function keyboardShow(element, elementTop, elementBottom, viewportHeight, keyboardHeight) {
  var details = {
    target: element,
    elementTop: Math.round(elementTop),
    elementBottom: Math.round(elementBottom),
    keyboardHeight: keyboardHeight,
    viewportHeight: viewportHeight
  };

  details.hasPlugin = keyboardHasPlugin();

  details.contentHeight = viewportHeight - keyboardHeight;

  console.log('keyboardShow', keyboardHeight, details.contentHeight);

  // figure out if the element is under the keyboard
  details.isElementUnderKeyboard = (details.elementBottom > details.contentHeight);

  ionic.keyboard.isOpen = true;

  // send event so the scroll view adjusts
  keyboardActiveElement = element;
  ionic.trigger('scrollChildIntoView', details, true);

  ionic.requestAnimationFrame(function(){
    document.body.classList.add(KEYBOARD_OPEN_CSS);
  });

  // any showing part of the document that isn't within the scroll the user
  // could touchmove and cause some ugly changes to the app, so disable
  // any touchmove events while the keyboard is open using e.preventDefault()
  document.addEventListener('touchmove', keyboardPreventDefault, false);

  return details;
}

function keyboardFocusOut(e) {
  clearTimeout(keyboardFocusOutTimer);

  keyboardFocusOutTimer = setTimeout(keyboardHide, 350);
}

function keyboardHide() {
  console.log('keyboardHide');
  ionic.keyboard.isOpen = false;

  ionic.trigger('resetScrollView', {
    target: keyboardActiveElement
  }, true);

  ionic.requestAnimationFrame(function(){
    document.body.classList.remove(KEYBOARD_OPEN_CSS);
  });

  // the keyboard is gone now, remove the touchmove that disables native scroll
  document.removeEventListener('touchmove', keyboardPreventDefault);
  document.removeEventListener('keydown', keyboardOnKeyDown);
}

function keyboardUpdateViewportHeight() {
  if( window.innerHeight > keyboardViewportHeight ) {
    keyboardViewportHeight = window.innerHeight;
  }
}

function keyboardOnKeyDown(e) {
  if( ionic.scroll.isScrolling ) {
    keyboardPreventDefault(e);
  }
}

function keyboardPreventDefault(e) {
  if( e.target.tagName !== 'TEXTAREA' ) {
    e.preventDefault();
  }
}

function keyboardOrientationChange() {
  var updatedViewportHeight = window.innerHeight;

  //too slow, have to wait for updated height
  if (updatedViewportHeight === keyboardViewportHeight){
    var count = 0;
    var pollViewportHeight = setInterval(function(){
      //give up
      if (count > 10){
        clearInterval(pollViewportHeight);
      }

      updatedViewportHeight = window.innerHeight;

      if (updatedViewportHeight !== keyboardViewportHeight){
        if (updatedViewportHeight < keyboardViewportHeight){
          ionic.keyboard.landscape = true;
        }
        else {
          ionic.keyboard.landscape = false;
        }
        keyboardViewportHeight = updatedViewportHeight;
        clearInterval(pollViewportHeight);
      }
      count++;

    }, 50);
  }
  else {
    keyboardViewportHeight = updatedViewportHeight;
  }
}

function keyboardGetHeight() {
  // check if we are already have a keyboard height from the plugin
  if ( ionic.keyboard.height ) {
    return ionic.keyboard.height;
  }

  if ( ionic.Platform.isAndroid() ){
    //should be using the plugin, no way to know how big the keyboard is, so guess
    if ( ionic.Platform.isFullScreen ){
      return 275;
    }
    //otherwise, wait for the screen to resize
    if ( window.innerHeight < keyboardViewportHeight ){
      return keyboardViewportHeight - window.innerHeight;
    }
    else {
      return 0;
    }
  }

  // fallback for when its the webview without the plugin
  // or for just the standard web browser
  if( ionic.Platform.isIOS() ) {
    if ( ionic.keyboard.landscape ){
      return 206;
    }

    if (!ionic.Platform.isWebView()){
      return 216;
    }

    return 260;
  }

  // safe guess
  return 275;
}

function keyboardIsWithinScroll(ele) {
  while(ele) {
    if(ele.classList.contains(SCROLL_CONTAINER_CSS)) {
      return true;
    }
    ele = ele.parentElement;
  }
  return false;
}

function keyboardHasPlugin() {
  return !!(window.cordova && cordova.plugins && cordova.plugins.Keyboard);
}

ionic.Platform.ready(function() {
  keyboardUpdateViewportHeight();

  // Android sometimes reports bad innerHeight on window.load
  // try it again in a lil bit to play it safe
  setTimeout(keyboardUpdateViewportHeight, 999);

  // only initialize the adjustments for the virtual keyboard
  // if a touchstart event happens
  document.addEventListener('touchstart', keyboardInit, false);
});

