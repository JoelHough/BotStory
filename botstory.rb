require 'json'
require 'net/http'
require 'ims/lti'

class BotStory < Sinatra::Base

  helpers do
    def js *scripts
      @js ||= []
      @js += scripts
    end
    
    def javascripts(*args)
      js = []
      js << settings.javascripts if settings.respond_to?('javascripts')
      js << args
      js << @js if @js
      js.flatten.uniq.map do |script| 
        "<script src=\"#{path_to script}\"></script>"
      end.join
    end

    def path_to script
      "#{script.to_s}.js"
    end
  end

  # Configure the application here

  # LTI settings
  CONSUMER_KEY    = '12345'
  CONSUMER_SECRET = 'secret'

  @@nonce_cache = []

  # Use sessions to store user data
  enable :sessions

  # Allow the app to be embedded in an iframe
  set :protection, except: :frame_options

  use Rack::LTI,
    consumer_key: CONSUMER_KEY,
    consumer_secret: CONSUMER_SECRET,
    app_path: '/',
    config_path: '/lti/config.xml',
    launch_path: '/lti/launch',
    nonce_validator: ->(nonce) {
      !@@nonce_cache.include?(nonce) && @@nonce_cache << nonce
    },
    time_limit: 3_600, # one hour
    success: ->(params, req, res) {
      req.env['rack.session'][:launch_params] = params
      req.env['rack.session'][:user] = params['user_id']
      req.env['rack.session'][:course] = params['course_id']
    },
    extensions: {
      'canvas.instructure.com' => {
        editor_button: {
          #url: '',
          icon_url: 'http://localhost:5000/favicon.png',
          enabled: true,
          selection_width: '840',
          selection_height: '640',
          text: 'Bot Story'
        }
      }
    },
    title: 'Bot Story',
    description: <<-END
Logic game
    END

  get '/' do
    if (session[:launch_params])
      @tp = IMS::LTI::ToolProvider.new(CONSUMER_KEY, CONSUMER_SECRET, session[:launch_params])
      @tp.extend IMS::LTI::Extensions::Content::ToolProvider
    end
    js :crafty, :game
    erb :index
  end
end
