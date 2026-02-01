.PHONY: dev serve build clean

IMAGE = jekyll/jekyll:4
PORT = 4000
WORKDIR = /srv/jekyll

dev:
	docker run --rm -it \
		-p $(PORT):4000 \
		-v "$$(pwd):$(WORKDIR)" \
		-w $(WORKDIR) \
		$(IMAGE) \
		sh -lc "bundle install && bundle exec jekyll serve --watch --host 0.0.0.0"

serve: dev

build:
	docker run --rm -it \
		-v "$$(pwd):$(WORKDIR)" \
		-w $(WORKDIR) \
		$(IMAGE) \
		sh -lc "bundle install && bundle exec jekyll build"

clean:
	rm -rf _site .jekyll-cache
