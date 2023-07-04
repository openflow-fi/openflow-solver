# Sample Openflow Solvers

## Usage

### Initialize repo

- `git clone git@github.com:openflow-fi/openflow-solvers.git`
- `cd openflow-solvers`
- `yarn`
- `cp .env.sample .env`
- Add solver private key to `.env` (solver must have native token)

### Run solvers

#### Single solver

`node src/portals`

#### Multiple solvers

`docker-compose up`
