.DEFAULT_GOAL := build

STATIC=/usr/share
VAR=/var
ETC=/etc
PROJECT=hcw
COMPONENT=patient

node_modules:
	npx yarn install

dist: node_modules
	npx yarn run build

build: dist

install:
	mkdir -p $(DESTDIR)$(STATIC)/$(PROJECT)/$(COMPONENT)/
	cp dist/* $(DESTDIR)$(STATIC)/$(PROJECT)/$(COMPONENT)/

clean:
	rm -rf dist node_modules
