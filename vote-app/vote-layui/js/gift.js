$(".image").click(function(){
    hide_image_list();
});

function hide_image_list(){
    $(".image").addClass('hide')
        .delay(2000)
        .queue(function(){
            $(this).
            removeClass('hide')
                .dequeue();
        });
}