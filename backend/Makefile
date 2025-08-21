.DEFAULT_GOAL := build

STATIC=/usr/share
VAR=/var
ETC=/etc
PROJECT=hcw
COMPONENT=backend

node_modules:
	npx yarn install --frozen-lockfile

dist: node_modules
	npx yarn run build

build: dist

install:
	mkdir -p $(DESTDIR)$(ETC)/$(PROJECT)
	cp .env.example $(DESTDIR)$(ETC)/$(PROJECT)/$(COMPONENT).conf

clean:
	rm -rf dist node_modules
