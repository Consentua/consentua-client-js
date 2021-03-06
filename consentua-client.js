/**
* Consentua JS client. Implements a JS wrapper for the Consentua service.
* Async operations return deferred objects, so use .done() to apply callbacks
*/

/**
* A low-level object for sending requests to an API endpoint
*/
function ConsentuaHTTP(opts)
{
    var self = this;

    // List of required options
    var reqOpts = [
    ];

    // Default values for non-required options
    var defOpts = {
        baseURL: 'https://test.consentua.com/', // The API endpoint to send requests to
        data: {}, // Parameters that will be included on every request
    };

    for(var i in reqOpts)
    {
        var k = reqOpts[i];
        if(typeof opts[k] == 'undefined')
        throw "Required option '"+k+"' is not set";
    }

    for(var k in defOpts)
    {
        if(typeof opts[k] == 'undefined')
        opts[k] = defOpts[k];
    }

    /**
    * Set a persistent parameter that will be included on all future requests
    */
    self.setPersistent = function(name, value)
    {
        opts.data[name] = value;
    }

    // Utility to add persistent parameters to the given object
    function addPersistent(ob)
    {
        for(var k in opts.data)
        {
            ob[k] = opts.data[k];
        }
    }


    var _httperr = function(xhr, textStatus, errorThrown)
    {
        if(xhr.status != '404') // 404s are expected in many cases, so don't throw an exception!
        {
            //throw {status: textStatus, error: errorThrown};
        }
    }


    /**
    * Send a GET request to the API
    */
    self.get = function(path, data)
    {
        if(typeof data != 'object' || data === null) // typeof null === 'object' :/
        var data = {};

        addPersistent(data);

        return $.get(opts.baseURL + path, data, null, 'json');
    }

    /**
    * Send a POST request to the API
    */
    self.post = function(path, data)
    {
        if(typeof data != 'object' || data === null) // typeof null === 'object' :/
        var data = {};

        addPersistent(data);

        return $.ajax({
            type: "POST",
            url: opts.baseURL + path,
            data: data,
            dataType: "json",
            error: _httperr
        });
    }

    /**
    * Post, but put the data in the query string. Y,IKR :-|
    */
    self.postQS = function(path, data)
    {
        if(typeof data != 'object' || data === null) // typeof null === 'object' :/
        var data = {};

        addPersistent(data);

        return $.ajax({
            type: "POST",
            url: opts.baseURL + path + "?" + $.param(data),
            data: {},
            dataType: "json",
            error: _httperr
        });
    }

    /**
     * POST data to the API as JSON
     */
    self.postBody = function(path, data)
    {
        if(typeof data != 'object' || data === null) // typeof null === 'object' :/
        var data = {};

        addPersistent(data);

        return $.ajax({
            type: 'POST',
            url: opts.baseURL + path,
            processData: false,
            contentType: 'application/json',
            data: JSON.stringify(data),
            dataType: "json",
            error: _httperr
        });
    }

}

/**
* Higher-level Consentua API operations
*/
function ConsentuaClient(opts) {

    /**
     * Set up options
     */

    // List of required options
    var reqOpts = [
        'serviceID',
        'clientID'
    ];

    // Default values for non-required options
    var defOpts = {
        serviceKey: false,
        lang: 'en',
        baseURL: 'https://test.consentua.com/'
    };

    for(var i in reqOpts)
    {
        var k = reqOpts[i];
        if(typeof opts[k] == 'undefined')
        throw "Required option '"+k+"' is not set";
    }

    for(var k in defOpts)
    {
        if(typeof opts[k] == 'undefined')
        opts[k] = defOpts[k];
    }


    var self = this;

    console.debug("Initialise Consentua client", opts);

    /**
     * Set up an HTTP client
     */
    self.http = new ConsentuaHTTP({baseURL: opts.baseURL});

    self.http.setPersistent('ServiceID', opts.serviceID);
    self.http.setPersistent('ServiceId', opts.serviceID);

    self.http.setPersistent('ClientID', opts.clientID);
    self.http.setPersistent('ClientId', opts.clientID);

    /**
     * Get debug info - eg credentials - mostly used to generate helpful debugging/error
     * messages
     */
     self.debugInfo = function(merge) {
         if(typeof merge == 'undefined') {
             merge = {};
         }

         merge.serviceID = opts.serviceID;
         merge.clientID = opts.clientID;
         merge.lang = opts.lang;
         merge.serviceKey = opts.serviceKey;

         return merge;
     }

    /**
     * Get auth information
     */
    self.getServiceID = function()
    {
        return opts.serviceID;
    }

    self.getClientID = function()
    {
        return opts.clientID;
    }

    /**
    * Log in to the API to get an access token
    * Some methods can be used without this
    */
    self.login = function()
    {
        var deferred = $.Deferred();

        if(opts.serviceKey === false)
        {
            console.error("Cannot login() to Consentua unless a serviceKey was specified when ConsentuaClient was instantiated");
            deferred.resolve(false);
            return;
        }

        var loggedin = function(data){
            if(!data.Success){
                console.error("Could not log in to Consentua service", data);
                deferred.resolve(false);
                return;
            }

            // Tokens are inconsistently named across methods :-|
            self.http.setPersistent('accessToken', data.Token);
            self.http.setPersistent('token', data.Token);

            console.debug("Logged in to Consentua service account", self.accessToken);
            deferred.resolve(true);
        };

        var d = new Date();
        var loginStr = opts.serviceKey + '_' + (d.getUTCDate()) + '_' + (d.getUTCMonth() + 1) + '_' + (d.getUTCFullYear());
        var loginToken = md5(loginStr).toUpperCase();
        console.log("Generate service login token", loginStr, loginToken);
        var args = {
            ClientId: opts.clientID,
            ServiceId: opts.serviceID,
            LoginToken: loginToken
        };

        self.http.postBody('/login/Service', args, false).done(loggedin);

        return deferred;
    }




    /**
    * Get all templates, they'll be cached
    */
    var templates = false;
    self.getTemplates = function()
    {
        var deferred = $.Deferred();

        if(templates !== false) {
            deferred.resolve(templates);
        }
        else {
            self.http.get('/template/AnonGet', {language: opts.lang}).done(function(response){
                templates = response.Templates; // Cache for later
                deferred.resolve(templates);
            }).fail(deferred.reject);
        }

        return deferred;
    }

    /**
     * Get a specific template
     */
    self.getTemplate = function(tid)
    {
        var def = $.Deferred();

        function pickTemplate(){
            for(var i in templates){
                var t = templates[i];
                if(t.Id == tid) {
                    t.ServiceID = opts.serviceID; // Patch the ServiceID into the template
                    def.resolve(t);
                    return;
                }
            }

            console.error("Template " + tid + " was not found", templates);
            def.reject(false);
        }

        self.getTemplates().done(pickTemplate).fail(def.reject);

        return def;
    }

    /**
    * Consentua has two types of identifier, we need to map between the GUIDs
    * that identify users in external systems and the IDs that identify users
    * internally

         self.uidmap[GUID] = UserID;

    */
    self.uidmap = {};

    /**
    * Test if a user with the given GUID exists; the deferred .done method receives
    * true if they do, false if not; if true, the second arg will be the UserId
    */
    self.testIfUserExists = function(guid)
    {
        var def = $.Deferred();

        self.http.get('/serviceuser/AnonGetServiceUser', {identifier: guid}).done(function(data){
            self.uidmap[guid] = data.UserId;
            def.resolve(true, data.UserId);
        }).fail(function(xhr, status){
            if(xhr.status == '404')
                def.resolve(false, undefined)
            else
                throw "Error " + xhr.status;
        });

        return def;
    }

    /**
    * Add a user to the service.
    * Deferred .done() is passed the UserID of the new user
    */
    self.addUser = function(email)
    {
        var def = $.Deferred();

        if(typeof email == 'undefined')
            email = "anon" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + "@consentua.com";

        console.log("Create user", email);

        var args = {EmailAddress: email};

        self.http.post('/serviceuser/AnonAddUserToService', args).done(function(result){
            console.log("Added user", result);
            self.uidmap[result.Identifier] = result.UserId;
            def.resolve(result);
        }).fail(function(r){
            console.error("Could not add user", r);
            def.reject();
        });

        return def;
    }

    /**
    * Get consents for the given UID
    */
    self.getConsents = function(uid)
    {
        if(typeof self.uidmap[uid] == 'undefined') {
            console.error("User identifier '" + uid + "' has not been resolved, yet - call addUser() or testIfUserExists()!");
        }

        var def = $.Deferred();
        self.http.postBody('/userconsent/AnonGetConsents', {"UserId": self.uidmap[uid]}).done(function(response){
            if(response.Success){
                def.resolve(response.Consent.Purposes);
            }
            else
            def.resolve({});
        });

        return def;
    }

    /**
    * Set consent for the given user. Purposes should be an object of the form:
    * { purposeID: boolean, purpose2ID: boolean }
    * Extra can contain arbitrary data, it will be JSON serialized and stored via getConsentsEx
    */
    self.setConsents = function(uid, templateid, purposes, extra)
    {
        if(typeof self.uidmap[uid] == 'undefined') {
            console.error("User identifier '" + uid + "' has not been resolved, yet - call addUser() or testIfUserExists()!");
        }

        var model = {
            "Consent": {
                "ClientId": opts.clientID,
                "ServiceId": opts.serviceID,
                "UserId": self.uidmap[uid],
                "Purposes": []
            }
        };

        for(var pid in purposes){
            model.Consent.Purposes.push({ConsentTemplateId: templateid, PurposeId:pid, Consent: purposes[pid] == true});
        }

        if(typeof extra !== "object") {
            extra = {};
        }

        model.AuthenticationData = JSON.stringify(extra);

        var def = $.Deferred();
        self.http.postBody('/userconsent/AnonSetConsentsEx', model).done(function(response){
            def.resolve(response);
        });

        return def;
    }

}



/*
* A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
* Digest Algorithm, as defined in RFC 1321.
* Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
* Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
* Distributed under the BSD License
* See http://pajhome.org.uk/crypt/md5 for more info.
*/

/*
* Configurable variables. You may need to tweak these to be compatible with
* the server-side, but the defaults work in most cases.
*/
var hexcase = 0;   /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = "";  /* base-64 pad character. "=" for strict RFC compliance   */

/*
* These are the functions you'll usually want to call
* They take string arguments and return either hex or base-64 encoded strings
*/
function md5(s)    { return rstr2hex(rstr_md5(str2rstr_utf8(s))); }
function b64_md5(s)    { return rstr2b64(rstr_md5(str2rstr_utf8(s))); }
function any_md5(s, e) { return rstr2any(rstr_md5(str2rstr_utf8(s)), e); }
function hex_hmac_md5(k, d)
{ return rstr2hex(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
function b64_hmac_md5(k, d)
{ return rstr2b64(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
function any_hmac_md5(k, d, e)
{ return rstr2any(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d)), e); }

/*
* Perform a simple self-test to see if the VM is working
*/
function md5_vm_test()
{
    return hex_md5("abc").toLowerCase() == "900150983cd24fb0d6963f7d28e17f72";
}

/*
* Calculate the MD5 of a raw string
*/
function rstr_md5(s)
{
    return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
}

/*
* Calculate the HMAC-MD5, of a key and some data (raw strings)
*/
function rstr_hmac_md5(key, data)
{
    var bkey = rstr2binl(key);
    if(bkey.length > 16) bkey = binl_md5(bkey, key.length * 8);

    var ipad = Array(16), opad = Array(16);
    for(var i = 0; i < 16; i++)
    {
        ipad[i] = bkey[i] ^ 0x36363636;
        opad[i] = bkey[i] ^ 0x5C5C5C5C;
    }

    var hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
    return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
}

/*
* Convert a raw string to a hex string
*/
function rstr2hex(input)
{
    try { hexcase } catch(e) { hexcase=0; }
    var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
    var output = "";
    var x;
    for(var i = 0; i < input.length; i++)
    {
        x = input.charCodeAt(i);
        output += hex_tab.charAt((x >>> 4) & 0x0F)
        +  hex_tab.charAt( x        & 0x0F);
    }
    return output;
}

/*
* Convert a raw string to a base-64 string
*/
function rstr2b64(input)
{
    try { b64pad } catch(e) { b64pad=''; }
    var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var output = "";
    var len = input.length;
    for(var i = 0; i < len; i += 3)
    {
        var triplet = (input.charCodeAt(i) << 16)
        | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
        | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
        for(var j = 0; j < 4; j++)
        {
            if(i * 8 + j * 6 > input.length * 8) output += b64pad;
            else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
        }
    }
    return output;
}

/*
* Convert a raw string to an arbitrary string encoding
*/
function rstr2any(input, encoding)
{
    var divisor = encoding.length;
    var i, j, q, x, quotient;

    /* Convert to an array of 16-bit big-endian values, forming the dividend */
    var dividend = Array(Math.ceil(input.length / 2));
    for(i = 0; i < dividend.length; i++)
    {
        dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
    }

    /*
    * Repeatedly perform a long division. The binary array forms the dividend,
    * the length of the encoding is the divisor. Once computed, the quotient
    * forms the dividend for the next step. All remainders are stored for later
    * use.
    */
    var full_length = Math.ceil(input.length * 8 /
        (Math.log(encoding.length) / Math.log(2)));
        var remainders = Array(full_length);
        for(j = 0; j < full_length; j++)
        {
            quotient = Array();
            x = 0;
            for(i = 0; i < dividend.length; i++)
            {
                x = (x << 16) + dividend[i];
                q = Math.floor(x / divisor);
                x -= q * divisor;
                if(quotient.length > 0 || q > 0)
                quotient[quotient.length] = q;
            }
            remainders[j] = x;
            dividend = quotient;
        }

        /* Convert the remainders to the output string */
        var output = "";
        for(i = remainders.length - 1; i >= 0; i--)
        output += encoding.charAt(remainders[i]);

        return output;
    }

    /*
    * Encode a string as utf-8.
    * For efficiency, this assumes the input is valid utf-16.
    */
    function str2rstr_utf8(input)
    {
        var output = "";
        var i = -1;
        var x, y;

        while(++i < input.length)
        {
            /* Decode utf-16 surrogate pairs */
            x = input.charCodeAt(i);
            y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
            if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
            {
                x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
                i++;
            }

            /* Encode output as utf-8 */
            if(x <= 0x7F)
            output += String.fromCharCode(x);
            else if(x <= 0x7FF)
            output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
            0x80 | ( x         & 0x3F));
            else if(x <= 0xFFFF)
            output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
            0x80 | ((x >>> 6 ) & 0x3F),
            0x80 | ( x         & 0x3F));
            else if(x <= 0x1FFFFF)
            output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
            0x80 | ((x >>> 12) & 0x3F),
            0x80 | ((x >>> 6 ) & 0x3F),
            0x80 | ( x         & 0x3F));
        }
        return output;
    }

    /*
    * Encode a string as utf-16
    */
    function str2rstr_utf16le(input)
    {
        var output = "";
        for(var i = 0; i < input.length; i++)
        output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
        (input.charCodeAt(i) >>> 8) & 0xFF);
        return output;
    }

    function str2rstr_utf16be(input)
    {
        var output = "";
        for(var i = 0; i < input.length; i++)
        output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
        input.charCodeAt(i)        & 0xFF);
        return output;
    }

    /*
    * Convert a raw string to an array of little-endian words
    * Characters >255 have their high-byte silently ignored.
    */
    function rstr2binl(input)
    {
        var output = Array(input.length >> 2);
        for(var i = 0; i < output.length; i++)
        output[i] = 0;
        for(var i = 0; i < input.length * 8; i += 8)
        output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
        return output;
    }

    /*
    * Convert an array of little-endian words to a string
    */
    function binl2rstr(input)
    {
        var output = "";
        for(var i = 0; i < input.length * 32; i += 8)
        output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
        return output;
    }

    /*
    * Calculate the MD5 of an array of little-endian words, and a bit length.
    */
    function binl_md5(x, len)
    {
        /* append padding */
        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var a =  1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d =  271733878;

        for(var i = 0; i < x.length; i += 16)
        {
            var olda = a;
            var oldb = b;
            var oldc = c;
            var oldd = d;

            a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
            d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
            c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
            b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
            a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
            d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
            c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
            b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
            a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
            d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
            c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
            b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
            a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
            d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
            c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
            b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

            a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
            d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
            c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
            b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
            a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
            d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
            c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
            b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
            a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
            d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
            c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
            b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
            a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
            d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
            c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
            b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

            a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
            d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
            c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
            b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
            a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
            d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
            c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
            b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
            a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
            d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
            c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
            b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
            a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
            d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
            c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
            b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

            a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
            d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
            c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
            b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
            a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
            d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
            c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
            b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
            a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
            d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
            c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
            b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
            a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
            d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
            c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
            b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
        }
        return Array(a, b, c, d);
    }

    /*
    * These functions implement the four basic operations the algorithm uses.
    */
    function md5_cmn(q, a, b, x, s, t)
    {
        return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
    }
    function md5_ff(a, b, c, d, x, s, t)
    {
        return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }
    function md5_gg(a, b, c, d, x, s, t)
    {
        return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }
    function md5_hh(a, b, c, d, x, s, t)
    {
        return md5_cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function md5_ii(a, b, c, d, x, s, t)
    {
        return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
    }

    /*
    * Add integers, wrapping at 2^32. This uses 16-bit operations internally
    * to work around bugs in some JS interpreters.
    */
    function safe_add(x, y)
    {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }

    /*
    * Bitwise rotate a 32-bit number to the left.
    */
    function bit_rol(num, cnt)
    {
        return (num << cnt) | (num >>> (32 - cnt));
    }

/**
 * CommonJS Compatability (for use in node etc.)
 * If module is defined, export ConsentuaClient
 */
if(typeof module !== 'undefined') {
  module.exports = ConsentuaClient;
}
