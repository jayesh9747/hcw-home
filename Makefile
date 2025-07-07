subdirs = backend practitioner admin patient

.PHONY: $(subdirs)

install: $(subdirs)
clean: $(subdirs)

$(subdirs):
	make -C $@ $(MAKECMDGOALS)

