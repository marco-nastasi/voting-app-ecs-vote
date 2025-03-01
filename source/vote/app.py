from flask import Flask, render_template, request, make_response, g
from redis import Redis
import os
import socket
import random
import json
import logging

# Environment variables
option_a = os.getenv('OPTION_A', "Cats")
option_b = os.getenv('OPTION_B', "Dogs")
redis_host = os.getenv('REDIS_HOST', 'redis')  # Default to localhost if not set
redis_port = int(os.getenv('REDIS_PORT', 6379))   # Default Redis port
hostname = socket.gethostname()

app = Flask(__name__)

gunicorn_error_logger = logging.getLogger('gunicorn.error')
app.logger.handlers.extend(gunicorn_error_logger.handlers)
app.logger.setLevel(logging.INFO)

def get_redis():
    if not hasattr(g, 'redis'):
        try:
            g.redis = Redis(
                host=redis_host,
                port=redis_port,
                db=0,
                socket_timeout=5
            )
            # Test the connection
            g.redis.ping()
            app.logger.info(f'Connected to Redis at {redis_host}:{redis_port}')
        except Exception as e:
            app.logger.error(f'Failed to connect to Redis: {str(e)}')
            raise
    return g.redis

@app.route("/", methods=['POST','GET'])
def hello():
    voter_id = request.cookies.get('voter_id')
    if not voter_id:
        voter_id = hex(random.getrandbits(64))[2:-1]

    vote = None

    if request.method == 'POST':
        try:
            redis = get_redis()
            vote = request.form['vote']
            app.logger.info('Received vote for %s', vote)
            data = json.dumps({'voter_id': voter_id, 'vote': vote})
            redis.rpush('votes', data)
        except Exception as e:
            app.logger.error(f'Error processing vote: {str(e)}')
            # You might want to handle this error appropriately for your use case

    resp = make_response(render_template(
        'index.html',
        option_a=option_a,
        option_b=option_b,
        hostname=hostname,
        vote=vote,
    ))
    resp.set_cookie('voter_id', voter_id)
    return resp

# New route for /vote
@app.route("/vote", methods=['POST','GET'])
def vote_page():
    # Reuse the same logic as the main route
    return hello()

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080, debug=True, threaded=True)