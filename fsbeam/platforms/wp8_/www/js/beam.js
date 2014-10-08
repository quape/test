var IS_WEB = false;
//var FS_HOST = 'http://test.freisein.de';
var FS_HOST = 'http://fs.local';
var VERSION = 1;

function initApp() {
    Fs.init();
    
    if(!localStorage.auth) {
        Number.show();
    } else {
        var f = function() {
            Fs.getJ('BeamBalance', function(o) {
                $(document).ajaxError(function(event, request, settings) {
                    if(Home.isInit) {
                        jAlert("Keine Netzwerkverbindung", function() {
                            if(Header.module) window[Header.module].close();
                            Home.show();
                        });
                    }
                })
                
                if(typeof o.balance === 'undefined' || (typeof o.version !== 'undefined' && o.version > VERSION)) {
                    jAlert("Es gibt ein Update! Bitte lade dir zuerst die aktuelle Version von Beam aus dem App Store. Danke!", function() {
                        navigator.app.exitApp();
                    });
                    return;
                }
                
                if(o.balance) Home.show(); else Number.show();
            });
        }
        
        var f2 = function() {
            $(document).ajaxError(function(event, request, settings) {
                jAlert('Keine Netzwerkverbindung', "Nochmal versuchen", function() {
                    f();
                });
            });

            f();
        }
        
        if(localStorage.pin) {
            Pin.show('', function(pin) {
                if(pin == localStorage.pin) {
                    f2();
                } else {
                    window.setTimeout(function() {
                        navigator.app.exitApp();
                    }, 2000);
                }
            });
        } else {
            f2();
        }
    }
}


Fs = (function() {
	var self = {
        init: function() {
//            IS_WEB = typeof device == 'undefined';
//            if(typeof device !== 'undefined' && device.platform == 'iOS') $('body').css('top', '20px');
        },
        
        loading: function(state) {
            if(typeof state === 'undefined') state = true;
            $('#loading-overlay, #loading').toggle(state);
        },

        get: function(url, args, onDone) {
			if(typeof args === 'function') {
				onDone = args;
				args = null;
            }
            
			$.get(FS_HOST+'/r/'+url, args, onDone);
		},

        getJ: function(url, args, onDone) {
			if(typeof args === 'function') {
				onDone = args;
				args = null;
			}
			
            
			$.get(FS_HOST+'/r/'+url, args, onDone, 'json');
		},

        postJ: function(url, args, onDone) {
			if(typeof args === 'function') {
				onDone = args;
				args = null;
			}
			
			$.post(FS_HOST+'/r/'+url, args, onDone, 'json');
		}
    }
	return self;
})();


Number = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#number');

            $('#number-enter').show();

            $('#number-enter form', self.$me).submit(function(e) {
                pd(e);
                
                if($('#number-enter input').val().length > 5) {
                    Fs.postJ('BeamConfirmNumber', {
                        number: $('#number-enter input').val()
                    }, function(o) {

                    });

                    $('.enter_code', self.$me).hide();

                    $('#number-enter').addClass('slideOut');
                    window.setTimeout(function() {
                        $('#number-enter').hide();
                        $('#number-confirm').show().addClass('slideIn');
    //                    window.setTimeout(function() {
    //                        $('#number-confirm').find('input').focus();
    //                    }, 200);
                    }, 200);
                }
            });
            
            $('.enter_code', self.$me).click(function() {
                if($('#number-enter input').val().length < 5) {
                    jAlert("Gib zuerst noch deine Nummer ein.");
                    return;
                }
                
                $(this).hide();
                $('#number-enter form', self.$me).submit();
            });

            $('#number-confirm form', self.$me).submit(function(e) {
                pd(e);
                
                Fs.postJ('BeamConfirmNumber', {
                    number: $('#number-enter input').val(),
                    pin: $(this).find('input').val()
                }, function(o) {
                    if(o && o.auth) {
                        localStorage.auth = o.auth;
                        self.close();
                        
                        if(o.topup) {
                            window.setTimeout(function() {
                                jAlert("<b>Glückwunsch.</b> Du hast jetzt dein eigenes Beam-Konto. Für den Anfang schenken wir dir "+o.topup+"&nbsp;Euro :-)");
                            }, 2000);
                        }
                    } else {
                       $('#number-confirm form').effect('shake', { distance: 10, times: 2 }, 350);
                    }
                });    
            });
            
            self.isInit = true;
        },
        
        show: function() {
            if(!self.isInit) self.init();
            $('#fs-head').show();
            Fx.slideIn(self.$me);
        },
        
        close: function() {
            Fx.slideOut(self.$me, function() {
                Home.show();
            });
        },
	}
	return self;
})();

Module = (function() {
	var self = {
	}
	return self;
})();


Home = (function() {
	var self = {
        isInit: false,
        balance: 0,
        
        init: function() {
            self.$me = $('#home');
            $('button,td,div', self.$me).click(function(e) {
                var target = $(this).attr('target');
                if(target) {
//                    if(target == 'Send') $('div.send', self.$me).addClass('rotate');
//                    else if(target == 'Receive') $('div.receive', self.$me).addClass('rotate');
                    
                    self.close();
                    Header.show(target, $('#'+target.toLowerCase()).find('.title').html());
                    window[$(this).attr('target')].show();
                }
            });
            
            self.isInit = true;
        },
        
        show: function() {
            if(!self.isInit) self.init();
            
            $('#fs-head').show();
            
            Fx.slideIn(self.$me);
            Header.hide();

            Fs.getJ('BeamBalance', function(o) {
                if(!o) balance = 0;
                self.balance = o.balance;

                self.$me.find('.balance span').html(formatAmount(o.balance));
                self.$me.find('.balance').removeClass('plus minus').addClass(o.balance > 0 ? 'plus' : '');
            });
        },
        
        close: function() {
            Fx.slideOut(self.$me, function() {
                //$('#fs-head').hide();
            });
        }
	}
	return self;
})();

Header = (function() {
	var self = {
        $me: $('body>header'),
        module: null,
        parent_module: null,
        parent_title: null,
        data: null,
        
        show: function(module, title, onBack) {
            if(onBack) {
                self.parent_module = self.module;
                self.parent_title = self.title;
            }

            self.module = module;
            self.title = title;
            //self.$me.show();
            
            if(self.$me.is(':visible')) {
                self.hide(function() {
                    title && self.$me.find('h1').html(title);
                    Fx.in('slideIn', self.$me);
                });
            } else {
                title && self.$me.find('h1').html(title);
                Fx.in('slideIn', self.$me);
            }
            
            
            self.$me.find('a').show().off().click(function(e) {
                window[self.module].close();
                self.module = '';
                
                if(onBack) {
                    self.show(self.parent_module, self.parent_title);
                    onBack();
                } else {
                    self.hide();
                    Home.show();
                }
            });
        },
        
        hide: function(f) {
            if(self.module == 'Home') self.$me.css('opacity', 0);
            else Fx.out('slideOut', self.$me, f);
        },
        
        back: function() {
            if(!self.module) navigator.app.exitApp();
            else if(self.$me.is(':visible')) self.$me.find('a').click();
        }
	}
	return self;
})();

News = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#news');
            
//            syncContacts();
//            window.setTimeout(function() {
//                syncContacts();
//            }, 1000);
            
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
            
            syncContacts();
            
            Fs.getJ('BeamNews', function(os) {                
                self.$me.find('ul').empty();
                $('.empty', self.$me).toggle(!os.length);
                
                for(var i = 0; i < os.length; i++) {
                    var o = os[i];
                    $li = $('#t-news').clone().attr('id', '');

//                    if(o.type == 1) $li.find('.type div').addClass('rot180');
//                    $li.find('.type div').addClass(o.type == 0 ? 'send' : 

                    $li.find('.name').text(o.name);
                    $li.find('.amount span').text(formatAmount(o.amount));

                    $li.appendTo(self.$me.find('ul')).show();
                }
            });
            
            Fx.slideIn(self.$me, f);
        },
        
        close: function() {
            Fx.slideOut(self.$me);
        }
	}
	return self;
})();

More = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#more');
            
            $('button', self.$me).click(function() {
                self.close();
                var target = $(this).attr('target');
                
                Header.show(
                    target,
                    $('#'+target.toLowerCase().replace(/_/, '-')).find('.title').html(),
                    function() {
                        More.show();
                    }
                );

                window[$(this).attr('target')].show();
            });
                
            
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
            $('h1', Header.$me).html('');
            Fx.slideIn(self.$me, f);
        },
        
        close: function() {
            Fx.slideOut(self.$me);
        }
	}
	return self;
})();

Transactions = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#transactions');
            moment.lang('de');  
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
            
            Fs.getJ('BeamTransactions', function(os) {
                self.$me.find('table').first().empty();
                $('.empty', self.$me).toggle(!os.length);
                
                for(var i = 0; i < os.length; i++) {
                    var o = os[i];
                    $li = $('#t-transaction').clone().attr('id', '');
                    
                    if(o.type == 1) $li.find('.type div').addClass('rot180');
                    $li.find('.type div').addClass(o.type == 0 ? 'send' : 'receive');
                    
                    $li.find('.amount span').html(formatAmount(o.amount));
                    $li.find('.name').text(o.name ? o.name : o.number);
                    $li.find('.date').html(moment.unix(o.lastact2).calendar());
                    
                    $li.appendTo(self.$me.find('table').first()).show();
                }
            });
            
            Fx.slideIn(self.$me, f);
        },
        
        close: function() {
            Fx.slideOut(self.$me);
        }
	}
	return self;
})();

Send = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#send-way');
            
            $('button', self.$me).click(function() {
                Fx.slideOut(self.$me);
                var target = $(this).attr('target');
                
                Header.show(
                    target,
                    $('#'+target.toLowerCase().replace(/_/, '-')).find('.title').html(),
                    function() {
                        Send.show();
                    }
                );

                window[$(this).attr('target')].show();
            });
            
            Tip('Um einem deiner Kontakte etwas zu senden, wähle einfach einen aus und gib dann den Betrag ein.');
            
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
            Fx.slideIn(self.$me, f);
        },
        
        close: function() {
            Fx.slideOut(self.$me);
        }
	}
	return self;
})();

Send_Qr = (function() {
    var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#send-qr');
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
            
            cordova.plugins.barcodeScanner.scan(
                function(result) {
//                    self.close();
                    
                    if(!result.cancelled && result.text) {
                        Send_Confirm.show(result.text);
                    }
                },
                function (error) {
//                    self.close(function() {
                        Home.show();
//                    });
                }
            );
            
//            Fx.slideIn(self.$me, f);
        },
        
        close: function(f) {
//            Fx.slideOut(self.$me, f);
        }
    }
    return self;
})();

Send_Id = (function() {
    var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#send-id');
            
            $('input', self.$me).keyup(function(e) {
                var code = e.keyCode || e.which;
                var bid = $(this).val();
                if((bid.length == 3 || bid.length == 70) && code != 8) {
                    $(this).val(bid+'-');
                }
            });

            $('button', self.$me).click(function(e) {
                pd(e);
                
                var bid = $('input', self.$me).val();
                bid = bid.replace(/[^a-zA-Z0-9]/, '');
                if(!bid) return;
                
                self.close(function() {
                    Send_Confirm.show(bid);
                });
            });
            
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
            
            Fx.slideIn(self.$me, function() {
                self.$me.find('input').val('').focus();
                f && f();
            });
        },
        
        close: function(f) {
            Fx.slideOut(self.$me, f);
        }
    }
    return self;
})();

Send_Confirm = (function() {
    var self = {
        isInit: false,
        bid: null,
        
        init: function() {
            self.$me = $('#send-confirm');

            $('button.ok', self.$me).click(function(e) {
                pd(e);
                
                Fs.loading();
                
                Fs.postJ('BeamSend', {
                    bid: self.bid,
                    action: 'confirm'
                }, function(o) {
                    Fs.loading(false);
                    
                    if(o) {
                        self.close(function() {
                            Send_Done.show(o);
                        });
                    } else {
                        jAlert('Die Überweisung wurde nicht ausgeführt!', function() {
                            self.close();
                        });
                    }
                });
                
            });
            
            $('button.cancel', self.$me).click(function(e) {
                pd(e);
                Header.hide();
                self.close(function() {                    
                    Home.show();
                });
            });
            
            self.isInit = true;
        },
        
        show: function(bid, f) {
            if(!self.isInit) self.init();
            
            Fs.postJ('BeamSend', { bid: bid }, function(o) {
                if(o) {
                    self.bid = o.bid;

                    $('.amount span', self.$me).text(formatAmount(o.amount));
                    $('.name').text(o.name);
                    $('.number').text(o.number.replace(/^49/, "0").replace(/^(\d{4})/, '$1 '));

                    Header.module = 'Send_Confirm';
                    Fx.slideIn(self.$me, f);
                    
                    if(parseFloat(o.amount) > parseFloat(Home.balance)) {
                        jAlert('Dein Guthaben von € '+formatAmount(Home.balance)+' reicht nicht aus.', function() {
                            self.close(function() {
                                Home.show();
                            });
                        });
                    }
                } else {
                    jAlert('Nichts gefunden.', function() {
                        self.close(function() {
                            Home.show();
                        });
                    });
                }
            });
        },
        
        close: function(f) {
            Fx.slideOut(self.$me, f);
        }
    }
    return self;
})();

Send_Contact = (function() {
    var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#send-contact');

            $('button', self.$me).click(function(e) {
                pd(e);
                
                var number = $('input', self.$me).val();
                if(!number) return;
                
                self.close();
                
            });
            
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
//    navigator.contacts.pickContact(function(contact){
//        console.log('The following contact has been selected:' + JSON.stringify(contact));
//    },function(err){
//        console.log('Error: ' + err);
//    });                
            
            var fPick = function(onDone) {

                window.plugins.PickContact.chooseContact(function (o) {
                    setTimeout(function () {
    //                    alert(o.displayName + " " + o.emailAddress + " " + o.phoneNr );

                        var name = o.displayName;
                        var number = o.phoneNr;
                        number = number.replace(/^0(1)/, '+49$1');

                        if(!number.match(/^\+49(14|15|16|17)/)) {
                            jAlert('Bitte einen Kontakt mit Handynummer auswählen.', function() {
                                Header.back();
                            });

                            return;
                        }

                        self.close(function() {
                            onDone(name, number);
                        });

                    }, 1);
                });         
            }
            
            var fNext = function(name, number) {
                Send_Amount.show(function(amount) {
                    Fs.loading();

                    Fs.postJ('BeamSend', {
                        name: name,
                        number: number,
                        amount: amount
                    }, function(o) {
                        Fs.loading(false);

                        Send_Confirm.show(o.bid);
                    });
                });
            }
            
            if(IS_WEB) {
                fNext('Matze', '01739169209');
            } else {
                fPick(function(name, number) {
                    fNext(name, number);
                });
            }
            
            Fx.slideIn(self.$me, f);
        },
        
        close: function(f) {
            Fx.slideOut(self.$me, f);
            Send_Amount.close();
        }
    }
    return self;
})();

Send_Amount = (function() {
	var self = {
        show: function(f) {
            Amount.show(function(amount) {
                f(amount);
            }, Home.balance, 'Dein Guthaben reicht nicht aus.');
        },
        
        close: function() {
            Amount.close();
        }
	}
	return self;
})();

Send_Done = (function() {
    var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#send-done');

            $('button', self.$me).click(function(e) {
                pd(e);
                Header.hide();
                self.close(function() {
                    Home.show();
                });
            });
            
            self.isInit = true;
        },
        
        show: function(o, f) {
            if(!self.isInit) self.init();
            Header.module = 'Send_Done';
            $('a', Header.$me).hide();
            Fx.slideIn(self.$me, f);
        },
        
        close: function(f) {
            Fx.slideOut(self.$me, f);
        }
    }
    return self;
})();

Receive = (function() {
	var self = {
        show: function(f) {
            Tip('Um zu empfangen, gib den gewünschen Betrag ein. Lasse dann den Sender den QR-Code scannen oder teile ihm die Beam-ID mit.');
            Receive_Amount.show(f);
        },
        
        close: function(f) {
            Receive_Amount.close(f);
        }
	}
	return self;
})();

Receive_Amount = (function() {
	var self = {
        show: function(f) {
            Amount.show(function(amount) {
                Receive_Code.show(amount);
            });
        },
        
        close: function() {
            Amount.close();
        }
	}
	return self;
})();

Amount = (function() {
	var self = {
        isInit: false,
        onDone: null,
        minAmount: null,
        minAmountError: null,
        maxAmount: null,
        maxAmountError: null,
        
        init: function() {
            self.$me = $('#amount');
            
            $('button.c', self.$me).click(function(e) {
                pd(e);
                var val = self.$me.find('input').val();
                val = val.replace(/\,/, '.');
                val = val.replace(/€ /, '');
                var val_old = val;
                
                var c = $(this).html();
                val += c;
                
                if(val.toString().match(/\.\d{3,}$/)) val = val_old;
                
                if(c == '0' && val.toString().match(/\.\d\d?$/)) {
                } else {
                    val = parseFloat(val);
                }
                
                if(val == 'NAN') val = '';
                if(val > 100) val = val_old;
                
                
                val = val.toString();
                if(val.match(/\./)) {
//                    val = val.replace(/(\.\d)$/, '$1'+0);
                }
                
                val = val.replace(/\./, ',');
                self.$me.find('input').val('€ '+val);
            });

            $('button.dec', self.$me).click(function(e) {
                pd(e);
                var val = self.$me.find('input').val();                
                val = val.replace(/\,/, '.');
                val = val.replace(/€ /, '');
                if(!val.match(/\./)) val = val + '.';
                
                val = val.replace(/\./, ',');
                self.$me.find('input').val('€ '+val);
            });

            $('button.back', self.$me).click(function(e) {
                pd(e);
                var val = self.$me.find('input').val();
                val = val.replace(/€ /, '');
                val = val.slice(0, -1);
                self.$me.find('input').val('€ '+val);
            });
            
            $('form', self.$me).submit(function(e) {
                pd(e);
                var amount = $(this).find('input').val();
                amount = amount.replace(/\,/, '.');
                amount = amount.replace(/€ /, '');
                
                if(!amount) return;
                if(amount + 0 < 1) {
                    jAlert("Mindestens 1 Euro.");
                    $(this).find('input').val('');
                    return;
                }
                
                if(self.minAmount && amount < self.minAmount) {
                    jAlert(self.minAmountError, function() {
                        self.$me.find('input').val('');
                    });
                } else if(self.maxAmount && amount > self.maxAmount) {
                    jAlert(self.maxAmountError, function() {
                        self.$me.find('input').val('');
                    });
                } else {
                    self.close(function() {
                        self.onDone(amount);
                    });
                }
            });
            
            self.isInit = true;
        },
        
        show: function(f, maxAmount, maxAmountError, minAmount, minAmountError) {
            self.onDone = f;
            self.maxAmount = maxAmount;
            self.maxAmountError = maxAmountError;
            self.minAmount = minAmount;
            self.minAmountError = minAmountError;
            
            if(!self.isInit) self.init();
            
            self.$me.find('input').val('');
            
            Fx.slideIn(self.$me);
        },
        
        close: function(f) {
            if(self.$me && self.$me.is(':visible')) Fx.slideOut(self.$me, f);
        }
	}
	return self;
})();

Pin = (function() {
	var self = {
        isInit: false,
        onDone: null,
        pin: '',
        
        init: function() {
            self.$me = $('#pin');
            
            $('button.c', self.$me).click(function(e) {
                pd(e);
                var c = $(this).html();
                self.pin += c;
            });

            $('button.dec', self.$me).click(function(e) {
                pd(e);
                self.pin += '.';
            });

            $('button.back', self.$me).click(function(e) {
                pd(e);
                self.pin = '';
            });
            
            $('form', self.$me).submit(function(e) {
                pd(e);
                self.close(function() {
                    self.onDone(self.pin);
                });
            });
            
            self.isInit = true;
        },
        
        show: function(title, f) {
            self.onDone = f;
            self.pin = '';
            
            if(!self.isInit) self.init();
            $('h2', self.$me).html(title ? title : '');
            Fx.slideIn(self.$me);
        },
        
        close: function(f) {
            if(self.$me && self.$me.is(':visible')) Fx.slideOut(self.$me, f);
        }
	}
	return self;
})();

Receive_Code = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#receive-code');
            self.iv_waiting = null;
            
            $('button', self.$me).click(function(e) {
                pd(e);
                Header.hide();
                self.close(function() {
                    Home.show();
                });
            });
            
            self.isInit = true;
        },
        
        show: function(amount, f) {
            if(!self.isInit) self.init();
            
            Fs.loading();
            
            Fs.postJ('BeamReceive', { amount: amount }, function(o) {
                Fs.loading(false);
                Header.hide();
                
                $('.amount span', self.$me).text(formatAmount(amount));
                
                self.$me.find('.qr').empty();
                var qrcode = new QRCode(self.$me.find('.qr').get(0), {
                    width : 150,
                    height : 150
                });
                qrcode.makeCode(o.bid);
                
                $('.id', self.$me).text(o.bid.replace(/([a-zA-Z0-9]{3})/, "$1-"));

                Header.module = 'Receive_Code';
                Fx.slideIn(self.$me, f);

                self.iv_waiting = window.setInterval(function() {
                    Fs.getJ('BeamReceive', { bid: o.bid }, function(o) {
                        if(o) {
                            window.clearInterval(self.iv_waiting);

                            self.close(function() {
                                Receive_Done.show({
                                    amount: o.amount,
                                    name: o.name,
                                    number: o.number
                                });
                            });
                        }
                    });

                }, 2000);
            });
        },
        
        close: function(f) {
            if(self.iv_waiting) window.clearInterval(self.iv_waiting);
            Fx.slideOut(self.$me, f);
        }
	}
	return self;
})();

Receive_Done = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#receive-done');
            
            $('button', self.$me).click(function(e) {
                pd(e);
                Header.hide();
                self.close(function() {
                    Home.show();
                });
            });
            
            self.isInit = true;

        },
        
        show: function(o, f) {
            if(!self.isInit) self.init();
            
            $('.amount span', self.$me).text(formatAmount(o.amount));
            $('.name').text(o.name);
            $('.number').text(o.number.replace(/^49/, "0").replace(/^(\d{4})/, '$1 '));
            
            $('a', Header.$me).hide();
            
            Header.module = 'Receive_Done';
            Fx.slideIn(self.$me, f);
        },
        
        close: function(f) {
            Fx.slideOut(self.$me, f);
        }
	}
	return self;
})();


Topup = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#topup-way');
            
            $('button', self.$me).click(function() {
                Fx.slideOut(self.$me);
                var target = $(this).attr('target');
                if(!target) return;
                
                Header.show(
                    target,
                    $('#'+target.toLowerCase()).find('.title').html(),
                    null,
                    function() {
                        Topup.show();
                    }
                );
                
                window[$(this).attr('target')].show();
            });
            
            $('.paypal', self.$me).click(function() {
                Amount.show(function(amount) {
                    var fee = parseFloat(amount) / 100 * 1.9 + .35;
                    
                    jConfirm("Nach Abzug der PayPal-Gebühren beträgt der Auflade-Betrag € "+formatAmount(amount - fee)+".", function() {
                        var ref = localStorage.auth.substr(localStorage.auth.length - 8);
                        var url = 'http://freisein.de/html/beam_topup.html#paypal_'+amount+'_'+ref;
                        
                        window.open(url, '_system');
                        
                        self.close(function() {
                            Topup_Auto.show();
                        });
                    }, function() {
                        self.close(function() {
                            Topup.show();
                        });
                    });
                });
            });
            
            $('.sofort', self.$me).click(function() {
                Amount.show(function(amount) {
                    var fee = parseFloat(amount) / 100 * 1.9 + .35;
                    
                    jConfirm("Nach Abzug der SOFORT-Gebühren beträgt der Auflade-Betrag € "+formatAmount(amount - fee)+".", function() {
                        var ref = localStorage.auth.substr(localStorage.auth.length - 8);
                        var url = 'http://freisein.de/html/beam_topup.html#sofort_'+amount+'_'+ref;
                        
                        window.open(url, '_system');
                        
                        self.close(function() {
                            Topup_Auto.show();
                        });
                    }, function() {
                        self.close(function() {
                            Topup.show();
                        });
                    });
                });
            });
            
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
            Fx.slideIn(self.$me, f);
        },
        
        close: function(f) {
            Amount.close();
            Fx.slideOut(self.$me, f);
        }
	}
	return self;
})();

Topup_Auto = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#topup-auto');
            
            $('button', self.$me).click(function() {
                self.close();
            });
            
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
            Header.module = 'Topup_Auto';
            $('a', Header.$me).hide();
            Fx.slideIn(self.$me, f);
        },
        
        close: function() {
            Fx.slideOut(self.$me, function() {
                Home.show();
            });
        }
	}
	return self;
})();

Topup_Manual = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#topup-manual');
            
            var ref = localStorage.auth.substr(localStorage.auth.length - 8);
            $('.ref', self.$me).html(ref.toUpperCase());
            
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
            Fx.slideIn(self.$me, f);
        },
        
        close: function() {
            Fx.slideOut(self.$me);
        }
	}
	return self;
})();

Topdown = (function() {
	var self = {
        isInit: false,
        amount: null,
        
        init: function() {
            self.$me = $('#topdown');
            
            $('button', self.$me).click(function() {
                Fx.slideOut(self.$me);
                var target = $(this).attr('target');
                if(!target) return;
                
                Header.show(
                    target,
                    $('#'+target.toLowerCase()).find('.title').html(),
                    function() {
                        Topdown.show();
                    }
                );
                
                window[$(this).attr('target')].show();
            });
            
            self.isInit = true;
        },
        
        show: function() {
            if(!self.isInit) self.init();
            
            if(Home.balance >= 10) {
                Amount.show(function(amount) {
                    self.amount = amount;
                    Fx.slideIn(self.$me);
                }, Home.balance, 'Du kannst maximal dein Guthaben von € '+formatAmount(Home.balance)+' wählen.', 10, 'Bitte wähle mindestens 10 Euro.');
            } else {
                jAlert('Ab einem Kontostand von € 10,- kannst du auszahlen.', function() {
                    self.close(function() {
                        Home.show();
                    });
                });
            }
        },
        
        close: function(f) {
            Fx.slideOut(self.$me, f);
            Amount.close();
        }
	}
	return self;
})();

Topdown_Paypal = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#topdown-paypal');
            
            $('form', self.$me).submit(function(e) {
                pd(e);
                Fs.postJ('BeamTopdown', {
                    amount: Topdown.amount,
                    method: 'paypal',
                    user: $('input', self.$me).val()
                });
                
                self.close(function() {
                    Topdown_Done.show();
                });
            });
            
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
            Fx.slideIn(self.$me, f);
        },
        
        close: function(f) {
            Fx.slideOut(self.$me, f);
        }
	}
	return self;
})();

Topdown_Bank = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#topdown-bank');
            
            $('form', self.$me).submit(function(e) {
                pd(e);
                Fs.postJ('Topdown', {
                    amount: Topdown.amount,
                    method: 'bank',
                    kto: $('input', self.$me).val(),
                    blz: $('input', self.$me).val(),
                    owner: $('input', self.$me).val()
                });
                
                self.close(function() {
                    Topdown_Done.show();
                });
            });            
            
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
            Fx.slideIn(self.$me, f);
        },
        
        close: function(f) {
            Fx.slideOut(self.$me, f);
        }
	}
	return self;
})();

Topdown_Done = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#topdown-done');
            
            $('button', self.$me).click(function(e) {
                pd(e);
                self.close(function() {
                    Home.show();
                });
            });
            
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
            $('a', Header.$me).hide();
            Fx.slideIn(self.$me, f);
        },
        
        close: function(f) {
            Fx.slideOut(self.$me, f);
        }
	}
	return self;
})();

Settings = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#settings');
            
            $('.pin', self.$me).click(function() {
                self.close();
                
                var f = function() {
                    Pin.show('Lege eine neue PIN fest', function(pin1) {
                        if(!pin1) {
                            localStorage.pin = "";
                            jAlert('PIN gelöscht.', function() {
                                self.show();
                            });
                        } else {
                            Pin.show('Wiederhole', function(pin2) {
                                if(pin1 === pin2) {
                                    localStorage.pin = pin1;
                                    jAlert('PIN festgelegt.', function() {
                                        self.show();
                                    });
                                } else {
                                    jAlert('Du hast dich wohl vertippt.', function() {
                                        self.show();
                                    });
                                }
                            });
                        }
                    });
                }
                
                if(localStorage.pin) {
                    Pin.show('Aktuelle PIN', function(pin) {
                        if(pin == localStorage.pin) {
                            f();
                        } else {
                            jAlert('Falsche PIN.', function() {
                                self.show();
                            });
                        }
                    });
                } else {
                    f();
                }
            });
            
             $('.pin-delete', self.$me).toggle(!!localStorage.pin).click(function() {
                self.close();
                
                Pin.show('Aktuelle PIN', function(pin) {
                    if(pin == localStorage.pin) {
                        localStorage.pin = "";
                        jAlert('PIN gelöscht.', function() {
                            self.show();
                        });
                    } else {
                        jAlert('Falsche PIN.', function() {
                            self.show();
                        });
                    }
                });
            });
            
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
            Fx.slideIn(self.$me, f);
        },
        
        close: function() {
            Pin.close();
            Fx.slideOut(self.$me);
        }
	}
	return self;
})();

Help = (function() {
	var self = {
        isInit: false,
        
        init: function() {
            self.$me = $('#help');
            
            $('button', self.$me).click(function() {
                var $target = $('section.'+$(this).attr('target'), self.$me);
                var $cur = $('section.'+$('button.cur', self.$me).attr('target'), self.$me);
                $('button', self.$me).removeClass('cur');
                $(this).addClass('cur');
                $cur.hide();
                $target.show();
//                Fx.out('slideOut', $cur, function() {
//                    Fx.in('slideIn', $target);
//                });
            });
            
            self.isInit = true;
        },
        
        show: function(f) {
            if(!self.isInit) self.init();
            Fx.slideIn(self.$me, f);
        },
        
        close: function() {
            Fx.slideOut(self.$me);
        }
	}
	return self;
})();


function pd(e) { e.preventDefault(); e.stopPropagation(); }
function l(s) { console.log(s ? s : 'null');}


Fx = (function() {
	var self = {
        out: function(name, $o, f) {
            $o.removeClass().addClass(name);
            window.setTimeout(function() {
//            $o.off().on('animationEnd', function() {
                $o.hide();
                if(f) f();
            }, 170);
        },
        
        in: function(name, $o, f) {
            $o.show().removeClass().addClass(name);
            window.setTimeout(function() {
//            $o.off().on('animationEnd', function() {
                if(f) f();
            }, 170);
        },
                
        slideOut: function($o, f) {
            window.setTimeout(function() {
                self.out('slideOut', $o, f);
            }, 80);
        },
        
        slideIn: function($o, f) {
            window.setTimeout(function() {
                self.in('slideIn', $o, f);
            }, 80);
        }
	}
	return self;
})();

jWin = (function() {
	var self = {
		show: function($o, cb) {
			$('#win-container')
				.fadeIn(100)
				.css({
					position: 'fixed',
					top: ($(window).height() - $o.outerHeight())/2.5
				});
    			$('#overlay').addClass('overlay-darker1').show();
                if(cb) cb();
		},
		
		close: function() {
			$('#win-container').hide();
			$('#overlay').removeClass('overlay-darker1').hide();
		}
	}
	return self;
})();

jAlert = (function(text, button, cb) {
    if(typeof button === 'function') {
        cb = button;
        button = null;
    }
    
    var $o = $('#alert');

    $('div', $o).html(text);
	$('button', $o)
        .html(button ? button : 'OK')
        .off()
        .click(function() {
            $o.hide();
            jWin.close();
            cb && cb();
            $(document).trigger('jalert');
        })

    jWin.show($o.show());
});

jConfirm = (function(text, onOk, onCancel) {
	var $o = $('#confirm').show();
	$('div', $o).html(text);
	$('button.ok', $o).off().click(function() {
		$o.hide();
		jWin.close();
		if(onOk) onOk();
	})
	$('button.cancel', $o).off().click(function() {
		$o.hide();
		jWin.close();
		if(onCancel) onCancel();
	})
	jWin.show($o);
});

formatAmount = function(n) {
    var n = parseFloat(n).toFixed(2).toString();
    
//    if(!n.match(/\./)) n = n + '.-';
    return n.replace(/\.00?$/, '.-')
//    .replace(/\.(\d)$/, ".$10")
    .replace(/\./g, ',');
}

function cleanNumber(n, blank) {
    if(!n) return null;
    n = n.toString();
    n = n.replace(/^0(1)/, '+49$1');
    if(!n.match(/^\+49(14|15|16|17)/)) return null;
    n = n.replace(/\D/g, '');
    
    if(blank) return n; else return '+'+n;
}

function syncContacts() {
    if(IS_WEB) return;
    l('syncing contacts');
    
    var options = new ContactFindOptions();
    options.filter = "";
    options.multiple = true;
    var filter = ["displayName","phoneNumbers"];
    
    navigator.contacts.find(function(os) {
        var contacts = {};
        for(var i = 0; i < os.length; i++) {
            var o = os[i];
            
            if(o.phoneNumbers) {
                for(var j = 0; j < o.phoneNumbers.length; j++) {
                    if(o.phoneNumbers[j] && o.displayName) {
                        var n = o.phoneNumbers[j].value;
                        n = cleanNumber(n, true);
                        if(n) contacts['n'+n] = o.displayName;
                    }
                }
            }
        }
        
        localStorage.contacts = JSON.stringify(contacts);
        
        Fs.postJ('BeamContacts', { contacts: contacts }, function() {});
        
//		for(var key in contacts) {
//            if(!contacts.hasOwnProperty(key)) continue;
//            l(key+': '+contacts[key]);
//        }

        
    }, function() { l('error searching'); }, filter, options);
}

initApp();

function Tip(tag, text) {
    if(!text) {
        text = tag;
        tag = Header.module;
    }
    
    if(!localStorage['tip.'+tag]) {
        localStorage['tip.'+tag] = 1;
        jAlert(text);
    }
}