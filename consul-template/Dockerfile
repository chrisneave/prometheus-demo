FROM progrium/busybox

COPY bin/docker /bin/
RUN chmod +x /bin/docker

COPY bin/consul-template /bin/
RUN chmod +x /bin/consul-template

ADD nginx.ctmpl /tmp/

ENTRYPOINT ["/bin/consul-template"]
CMD ["-consul", "consul:8500", "-template", "/tmp/nginx.ctmpl:/etc/nginx/nginx.conf:docker exec prometheus-demo-nginx nginx -s reload", "-retry", "10s"]
