
var audiolocal = document.getElementById('localaudio');
var audioremote = document.getElementById('remoteaudio');

var socket;
var configuration = {
   sockets: [socket],
    uri: '', 
    password: '',
    realm: '172.30.2.17',
};;

var incomingCallAudio = new window.Audio('sounds/ringtone.wav');
incomingCallAudio.loop = true;
var outgoingCallAudio = new window.Audio('sounds/ringbacktone.wav');
outgoingCallAudio.loop = true;
var answeredCallAudio = new window.Audio('sounds/answered.wav');
answeredCallAudio.loop = false;
var rejectedCallAudio = new window.Audio('sounds/rejected.wav');
rejectedCallAudio.loop = false;
// var remoteAudio = new window.Audio();
// remoteAudio.autoplay = true;



var session;
var phone;

var completeSession = function () {
    console.log("Complete Session !!!!!!!!!!!!!!!!!!!!!!!!!!");
    session = null;
    rejectedCallAudio.play();
    updateUI();
};

var remoteAudio = window.document.createElement('audio');
window.document.body.appendChild(remoteAudio);

function sipRegister() {
    try{
        btnRegister.disabled = true;
        if ( !txtPrivateIdentity.value || !txtPassword.value) {
            errorMessage.innerHTML = '<b>Please fill madatory fields (*)</b>';
            btnRegister.disabled = false;
            return;
        }    

        var socket = new JsSIP.WebSocketInterface('ws://172.30.2.17:8088/ws');
        configuration = {
           sockets: [socket],
            uri: 'sip:'+txtPrivateIdentity.value+'@'+configuration.realm,
            password: txtPassword.value,
            realm: configuration.realm,
            register_expires: 60000,
            display_name : txtPrivateIdentity.value,
            // 'ws_servers': 'ws://172.30.2.17:8088/ws'
        };
        if (configuration.uri && configuration.password) {
            JsSIP.debug.enable("JsSIP:*"); // more detailed debug output
            $('#errorMessage').hide();
            phone = new JsSIP.UA(configuration);
            phone.start();
            
            phone.on('registrationFailed', function (ev) {
                $('#errorMessage').show();
                $('#callControl').hide();
                $('#inCallButtons').hide();
                errorMessage.innerHTML = '<b>Registering on SIP server failed with error: ' + ev.cause+'</b>';
                //alert('Registering on SIP server failed with error: ' + ev.cause);
                configuration.uri = null;
                configuration.password = null;
                updateUI();
            });
            phone.on('registered', function (ev) {
                $('#errorMessage').hide();
                updateUI();
            });
            phone.on('connected', function(ev){
                updateUI();
            });
            phone.on('newRTCSession', function (ev) {
                $('#errorMessage').hide();
                $('#registration').hide();
                $('#centerdiv').show();
                $('#callControl').show();
                $('#inCallButtons').show();
                var newSession = ev.session;
                var originator = ev.originator;
                var request = ev.request;
                if (session) { // hangup any existing call
                    console.log("session terminate !!!!!!!!!!!!!!");
                    session.terminate();
                }
                session = newSession;
                session.on('ended', completeSession);
                session.on('failed', completeSession);
                session.on('accepted', updateUI);
                session.on('confirmed', function () {
                    console.log("Confirmed !!!!!!!!!!!!!!");          
                    //incomingCallAudio.pause();
                    //outgoingCallAudio.pause();       
                    remoteAudio.src = window.URL.createObjectURL(
                        newSession.connection.getRemoteStreams()[0]
                    );
                    remoteAudio.play();    
                    // var localStream = session.connection.getLocalStreams()[0];
                    // var dtmfSender = session.connection.createDTMFSender(localStream.getAudioTracks()[0])
                    // session.sendDTMF = function (tone) {
                    //     dtmfSender.insertDTMF(tone);
                    // };
                    updateUI();
                });
                session.on('newDTMF', function () {
                    console.log("newDTMF !!!!!!!!!!!!!!");  
                });
                session.on('addstream', function (e) {
                    console.log("addstream !!!!!!!!!!!!!!");        
                    incomingCallAudio.pause();
                    outgoingCallAudio.pause();
                    remoteAudio.src = window.URL.createObjectURL(e.stream); 
                    remoteAudio.play();
                });
                session.on('icecandidate', function(data){
                    self.count_icecandidate++;
                    let that = this;
                    if(self.count_icecandidate > 2)
                    {
                        data.ready()
                    }
                });
                if (session.direction === 'incoming') {
                    incomingCallAudio.play();
                }else{
                    outgoingCallAudio.play();
                }
                updateUI();
   
            });
        }
    }
    catch (e) {
        errorMessage.innerHTML = "<b>2:" + e + "</b>";
    }
}

function sipUnRegister() {
    if (phone) {
        phone.unregister();
        phone.stop(); // shutdown all sessions
        configuration.uri = configuration.password = null;
        updateUI();
    }
}
  
var callOptions = {
    //'replaces': session,
    'extraHeaders': [ 'X-Foo: foo', 'X-Bar: bar' ],
    'mediaConstraints': {'audio': true, 'video': false},
    'pcConfig': {
        'rtcpMuxPolicy': 'negotiate',
        'iceServers': [
        ]
      },
};

function sipTransfer() {
    if (phone) {
        var destination = $('#txtPhone').val();
        session.refer(destination,callOptions);
        completeSession();
    }
}



$('#Callconnect').click(function () {
    var dest = $('#txtPhone').val();
    console.log("connect call !!!!!!!!!!!!!!  "+ dest);
    phone.call(dest, callOptions);
    // var text = 'Hello Bob!';
    // phone.sendMessage('sip:6001@172.30.1.14', text);
    updateUI();
    console.log("connect call !!!!!!!!!!!!!!  "+ dest + " " + configuration.uri + " " + configuration.password);
    
    // var text = 'Hello Bob!';            
    // console.log("Sending message !!!!!!!!!!!!!!");
    // phone.sendMessage('sip:6001@172.30.1.14', text);
});


$('#answer').click(function () {
    session.answer(callOptions);
    answeredCallAudio.play();
});

var hangup = function () {    
    rejectedCallAudio.play();
    session.terminate();
};

$('#hangUp').click(hangup);
$('#reject').click(hangup);

$('#muted').click(function () {
    console.log('MUTE CLICKED');
    if (session.isMuted().audio) {
        session.unmute({
            audio: true
        });
    } else {
        session.mute({
            audio: true
        });
    }
    updateUI();
});
$('#txtPhone').keypress(function (e) {
    if (e.which === 13) { //enter
        $('#Callconnect').click();
    }
});
$('#inCallButtons').on('click', '.dialpad-char', function (e) {
    var $target = $(e.target);
    var value = $target.data('value');
    //session.sendDTMF(value.toString());
    //console.log("Pressed key " + value.toString());
    var display = $('#txtPhone').val();
    $('#txtPhone').val(display + value.toString());

});
// $('#inCallButtons #dialPad .dialpad-char').click(function(e) {
//     console.log("Pressed key " + $(e.currentTarget).html());
//     // var display = $('#display').val();
//     // $('#display').val(display + $(e.currentTarget).html());
    
// });
function updateUI() {
    if (configuration.uri && configuration.password) {
        $('#errorMessage').hide();
        $('#registration').hide();
        $('#centerdiv').show();
        $('#callControl').show();
        $('#inCallButtons').show();
        if (session) {
            console.log("Session TRUE !!!!!!!!!!!!!!  ");
            if (session.isInProgress()) {
                console.log("Session is In Progress !!!!!!!!!!!!!!  ");       
                if (session.direction === 'incoming') {
                    console.log("incoming ...... !!!!!!!!!!!!!!  "); 
                    //alert('incoming: ');
                    $('#incomingCallNumber').html(session.remote_identity.uri);
                    $('#incomingCall').show();
                    $('#callControl').hide();
                    $('#inCallButtons').hide();
                    $('#incomingCall').show();
                } else { 
                    console.log("Ringing ...... !!!!!!!!!!!!!!  ");  
                    $('#callInfoText').html('Sonnerie...');
                    $('#callInfoNumber').html(session.remote_identity.uri.user);
                    $('#callStatus').show();                    
                }

            } else if (session.isEstablished()) {
                $('#callStatus').show();
                $('#incomingCall').hide();
                $('#callInfoText').html('En appel');
                $('#callInfoNumber').html(session.remote_identity.uri.user);
                $('#inCallButtons').show();
                incomingCallAudio.pause();
                outgoingCallAudio.pause();
            }
            $('#callControl').hide();
        } else {
            $('#incomingCall').hide();
            $('#callControl').show();
            $('#inCallButtons').show();
            $('#callStatus').hide();
            incomingCallAudio.pause();
            outgoingCallAudio.pause();
        }
        //microphone mute icon
        if (session && session.isMuted().audio) {
            $('#muteIcon').addClass('fa-microphone-slash');
            $('#muteIcon').removeClass('fa-microphone');
        } else {
            $('#muteIcon').removeClass('fa-microphone-slash');
            $('#muteIcon').addClass('fa-microphone');
        }
    } else {
        $('#callControl').hide();
        $('#inCallButtons').hide();
        $('#centerdiv').hide();
        $('#errorMessage').show();
        $('#registration').show();
    }
}
