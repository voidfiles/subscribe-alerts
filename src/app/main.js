/* globals webkitNotifications: true */
define(["jquery"], function($) {
  var accessToken = localStorage.accessToken;
  var channelId = localStorage.channelId;

  if (!channelId) {
    chrome.pushMessaging.getChannelId(true, function (userChannelObj) {
      localStorage.channelId = channelId = userChannelObj.channelId;
    });
  }

  if (!accessToken) {
    chrome.tabs.create({url: "chrome-extension://cfeahloocnncpelfiekbodlmlojfoapi/options.html", active: true, selected: true}, function (tab) {
      chrome.windows.update(tab.windowId, {focused: true});
    });
  }

  var UrlOpener = function (url) {
    this.url = url;
  };

  UrlOpener.prototype.open = function () {
    var url = this.url;
    chrome.tabs.query({url: url}, function (tabs) {
      if (tabs.length) {
        $.each(tabs, function (tab) {
          if (tab.url === url) {
            chrome.tabs.update(tab.id, {active: true, selected: true});
            chrome.windows.focused(tab.windowId, {focused: true});
          }
        });
      } else {
        chrome.tabs.create({url: url, active: true, selected: true}, function (tab) {
          chrome.windows.update(tab.windowId, {focused: true});
        });
      }
    });
  };

  var fetchDataUri = function (url) {
    window.URL = window.URL || window.webkitURL;  // Take care of vendor prefixes.
    var deferred = $.Deferred();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';

    xhr.onload = function (e) {
      if (this.status === 200) {
        var blob = this.response;
        deferred.resolve(window.URL.createObjectURL(blob));
      } else {
        deferred.reject();
      }
    };

    xhr.send();
    return deferred.promise();
  };

  chrome.notifications.onClicked.addListener(function (link) {
      var opener = new UrlOpener(link);
      opener.open();
  });

  var createNotification = function (icon_url, title, text, channel_id, message_id, image_blob) {
      var opts = {
        type: 'basic',
        iconUrl: icon_url,
        title: title,
        message: text
      };
      console.log('Found a blob?', image_blob);
      if (image_blob) {
        opts.type = 'image';
        opts.imageUrl = image_blob;
      }

      var link = 'https://directory.app.net/alerts/' + channel_id + '/message/' + message_id;
      chrome.notifications.create(link, opts, function () {});
  };

  function handlePushMessage (message) {
    console.log("Handling message", message);
    var payload = JSON.parse(message.payload);
    if (payload.type !== 'alert') {
      return;
    }
    var p1 = $.ajax({
      url: 'https://alpha-api.app.net/stream/0/channels/' + payload.channel_id + '/messages/' + payload.id,
      data: {
        include_message_annotations: 1
      },
      headers: {
        'Authorization': 'Bearer ' + localStorage.accessToken,
      }
    });

    var p2 = $.ajax({
      url: 'https://alpha-api.app.net/stream/0/channels/' + payload.channel_id,
      data: {
        include_annotations: 1
      },
      headers: {
        'Authorization': 'Bearer ' + localStorage.accessToken,
      }
    });

    $.when(p1, p2).done(function (a1, a2) {
      var message = a1[0];
      var channel = a2[0];
      var title = 'New Message';
      var fallback_url;
      if (channel.data.annotations) {
        $.each(channel.data.annotations, function (key, annotation) {
          if (annotation.type === 'net.app.core.broadcast.metadata') {
            if (annotation.value.title) {
              title = annotation.value.title;
            }
            if (annotation.value.fallback_url) {
              fallback_url = annotation.value.fallback_url;
            }
          }
        });
      }
      var image_url;
      var find_image_deferred = $.Deferred();
      var find_image_promise = find_image_deferred.promise();
      if (message.data.annotations) {
        $.each(message.data.annotations, function (key, annotation) {
          if (annotation.type === 'net.app.core.oembed') {
            if (annotation.value.thumbnail_url) {
              image_url = annotation.value.thumbnail_url;
              return false;
            }
            if (annotation.value.type === 'photo' && annotation.value.url) {
              image_url = annotation.value.url;
              return false;
            }
          }
        });
      }
      console.log('Found a image?', image_url);
      if (!image_url) {
        find_image_deferred.resolve();
      } else {
        fetchDataUri(image_url).done(function (blob) {
          find_image_deferred.resolve(blob);
        }).fail(function () {
          find_image_deferred.resolve();
        });

      }

      find_image_promise.done(function (image_blob) {
        createNotification(message.data.user.avatar_image.url, title, message.data.text, message.data.channel_id, message.data.id, image_blob);
      });
    });
        
  };

  chrome.pushMessaging.onMessage.addListener(function (message) {
    if (message.payload === 'testing') {
      message = {payload: '{"channel_id": "26064", "id": "1570185", "type": "alert"}'};
    }
    handlePushMessage(message);
  });
  
});
