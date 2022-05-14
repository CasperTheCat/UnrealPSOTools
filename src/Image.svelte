<script>
	import { createEventDispatcher } from 'svelte';

	export let hash = undefined;

	const dispatch = createEventDispatcher();

    async function HandleImageSummon(event)
    {
        let rect = event.target.getBoundingClientRect();

        let modx = rect.x + (rect.width/2);// + window.pageXOffset;
        let mody = rect.y + (rect.height/2);// + window.pageYOffset;

        if (window !== undefined && window.scrollY !== undefined && window.scrollX !== undefined)
        {
            modx = modx + window.scrollX;
            mody = mody + window.scrollY - (innerHeight / 2);
        }

        dispatch('summon', {
            "hash": hash,
            "x": modx,//.pageX,
            "y": mody//pageY
        });
    }
</script>

<img src="/api/image/tn/{hash}" alt="" on:click={HandleImageSummon}>

<style>
	img {
		width: 100%;
		margin: 0;
		border: none;
	}
</style>